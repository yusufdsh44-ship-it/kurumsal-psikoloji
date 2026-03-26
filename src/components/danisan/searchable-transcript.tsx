"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { Search, ChevronUp, ChevronDown, X, Mic } from "lucide-react"

interface Props {
  text: string
  className?: string
  placeholder?: string
}

export function SearchableTranscript({ text, className = "", placeholder }: Props) {
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // Find all match positions
  const matches = useMemo(() => {
    if (!query || query.length < 2 || !text) return []
    const positions: number[] = []
    const lower = text.toLowerCase()
    const q = query.toLowerCase()
    let idx = 0
    while (true) {
      idx = lower.indexOf(q, idx)
      if (idx === -1) break
      positions.push(idx)
      idx += 1
    }
    return positions
  }, [text, query])

  // Reset active index when matches change
  useEffect(() => {
    setActiveIndex(0)
  }, [matches.length])

  // Scroll to active match
  useEffect(() => {
    if (matches.length === 0) return
    const el = containerRef.current?.querySelector(`[data-match-index="${activeIndex}"]`)
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [activeIndex, matches.length])

  // Auto-scroll to bottom when no search (for live transcript)
  useEffect(() => {
    if (!query && endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [text, query])

  const goNext = useCallback(() => {
    if (matches.length === 0) return
    setActiveIndex(prev => (prev + 1) % matches.length)
  }, [matches.length])

  const goPrev = useCallback(() => {
    if (matches.length === 0) return
    setActiveIndex(prev => (prev - 1 + matches.length) % matches.length)
  }, [matches.length])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); goNext() }
    if (e.key === "Escape") { setQuery("") }
  }, [goNext])

  // Build highlighted text
  const rendered = useMemo(() => {
    if (!text) return null
    if (!query || query.length < 2 || matches.length === 0) {
      return <span>{text}</span>
    }

    const parts: React.ReactNode[] = []
    let lastEnd = 0
    const qLen = query.length

    matches.forEach((pos, i) => {
      // Text before this match
      if (pos > lastEnd) {
        parts.push(<span key={`t${i}`}>{text.slice(lastEnd, pos)}</span>)
      }
      // The match itself
      const isActive = i === activeIndex
      parts.push(
        <mark
          key={`m${i}`}
          data-match-index={i}
          className={`rounded-sm px-0.5 ${isActive ? "bg-amber-400 text-amber-950" : "bg-yellow-200 text-yellow-900"}`}
        >
          {text.slice(pos, pos + qLen)}
        </mark>
      )
      lastEnd = pos + qLen
    })

    // Remaining text after last match
    if (lastEnd < text.length) {
      parts.push(<span key="tail">{text.slice(lastEnd)}</span>)
    }

    return parts
  }, [text, query, matches, activeIndex])

  if (!text && !placeholder) return null

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Search bar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/40 bg-muted/20 shrink-0">
        <Search className="w-3 h-3 text-muted-foreground/60 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Transkriptte ara..."
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/40"
        />
        {query && (
          <>
            {matches.length > 0 ? (
              <span className="text-[10px] text-muted-foreground font-mono tabular-nums shrink-0">
                {activeIndex + 1}/{matches.length}
              </span>
            ) : query.length >= 2 ? (
              <span className="text-[10px] text-muted-foreground/50 shrink-0">0 sonuç</span>
            ) : null}
            <button onClick={goPrev} disabled={matches.length === 0}
              className="p-0.5 rounded hover:bg-muted disabled:opacity-30 transition-colors">
              <ChevronUp className="w-3 h-3 text-muted-foreground" />
            </button>
            <button onClick={goNext} disabled={matches.length === 0}
              className="p-0.5 rounded hover:bg-muted disabled:opacity-30 transition-colors">
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            <button onClick={() => setQuery("")}
              className="p-0.5 rounded hover:bg-muted transition-colors">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </>
        )}
      </div>

      {/* Content */}
      <div ref={containerRef}
        className="flex-1 overflow-y-auto px-3 py-2 text-xs font-mono text-muted-foreground whitespace-pre-wrap">
        {text ? rendered : (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-12 opacity-40">
            <Mic className="w-5 h-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{placeholder ?? "Kayıt butonuna basarak başlayın"}</p>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  )
}
