#!/Library/Frameworks/Python.framework/Versions/3.13/bin/python3.13
"""
Persistent transcription worker.
mlx-whisper (Apple Silicon optimized) + pyannote diarization.
Communicates via stdin/stdout JSON lines.
"""

import sys
import json
import os
import time
import ssl

# Fix SSL + NLTK
try:
    ssl._create_default_https_context = ssl._create_unverified_context
except AttributeError:
    pass
try:
    import nltk
    nltk.download("punkt_tab", quiet=True)
except Exception:
    pass

os.environ["TOKENIZERS_PARALLELISM"] = "false"
import warnings
warnings.filterwarnings("ignore")

import torch

HF_TOKEN = os.environ.get("HF_TOKEN", "")
LANGUAGE = "tr"
MLX_MODEL = "mlx-community/whisper-large-v3-mlx"


def main():
    # Load mlx-whisper (Apple Silicon GPU accelerated)
    sys.stderr.write("LOADING_WHISPER\n")
    sys.stderr.flush()
    import mlx_whisper
    # Warm up model by doing a dummy transcribe (loads weights into memory)
    # Create a tiny silent wav for warmup
    import wave, struct, tempfile
    warmup_path = tempfile.mktemp(suffix=".wav")
    w = wave.open(warmup_path, "w")
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000)
    w.writeframes(struct.pack("<" + "h" * 16000, *([0] * 16000)))
    w.close()
    mlx_whisper.transcribe(warmup_path, language=LANGUAGE, path_or_hf_repo=MLX_MODEL)
    os.unlink(warmup_path)
    sys.stderr.write("WHISPER_OK\n")
    sys.stderr.flush()

    # Load diarization model
    diarize_model = None
    if HF_TOKEN:
        try:
            sys.stderr.write("LOADING_DIARIZE\n")
            sys.stderr.flush()
            from whisperx.diarize import DiarizationPipeline
            diarize_model = DiarizationPipeline(token=HF_TOKEN, device=torch.device("cpu"))
            sys.stderr.write("DIARIZE_OK\n")
            sys.stderr.flush()
        except Exception as e:
            sys.stderr.write(f"DIARIZE_FAIL:{e}\n")
            sys.stderr.flush()

    sys.stderr.write("READY\n")
    sys.stderr.flush()

    # Process loop
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            cmd = json.loads(line)
            audio_path = cmd["path"]

            if not os.path.exists(audio_path):
                print(json.dumps({"ok": False, "error": f"File not found: {audio_path}"}))
                sys.stdout.flush()
                continue

            t0 = time.time()

            # Transcribe with mlx-whisper (fast, Apple Silicon)
            result = mlx_whisper.transcribe(
                audio_path,
                language=LANGUAGE,
                path_or_hf_repo=MLX_MODEL,
            )

            t_transcribe = time.time() - t0

            # Build segments from mlx-whisper output
            raw_segments = result.get("segments", [])
            segments = []
            for seg in raw_segments:
                segments.append({
                    "start": round(seg.get("start", 0), 2),
                    "end": round(seg.get("end", 0), 2),
                    "text": seg.get("text", "").strip(),
                    "speaker": "UNKNOWN",
                })

            # Diarize if available
            t_diarize_start = time.time()
            if diarize_model is not None:
                try:
                    from whisperx.diarize import assign_word_speakers
                    min_spk = cmd.get("min_speakers", 2)
                    max_spk = cmd.get("max_speakers", 2)
                    diarize_segs = diarize_model(audio_path, min_speakers=min_spk, max_speakers=max_spk)

                    # assign_word_speakers expects whisperx format
                    whisperx_result = {"segments": [{"start": s["start"], "end": s["end"], "text": s["text"]} for s in segments]}
                    assigned = assign_word_speakers(diarize_segs, whisperx_result)

                    # Update speaker labels
                    for i, seg in enumerate(assigned.get("segments", [])):
                        if i < len(segments):
                            segments[i]["speaker"] = seg.get("speaker", "UNKNOWN")
                except Exception as e:
                    sys.stderr.write(f"DIARIZE_ERR:{e}\n")
                    sys.stderr.flush()

            t_diarize = time.time() - t_diarize_start
            elapsed = time.time() - t0

            full_text = " ".join(s["text"] for s in segments if s["text"])

            print(json.dumps({
                "ok": True,
                "text": full_text,
                "segments": segments,
                "elapsed": round(elapsed, 2),
                "t_transcribe": round(t_transcribe, 2),
                "t_diarize": round(t_diarize, 2),
                "diarized": diarize_model is not None,
            }))
            sys.stdout.flush()

        except json.JSONDecodeError:
            print(json.dumps({"ok": False, "error": "Invalid JSON"}))
            sys.stdout.flush()
        except Exception as e:
            print(json.dumps({"ok": False, "error": str(e)}))
            sys.stdout.flush()


if __name__ == "__main__":
    main()
