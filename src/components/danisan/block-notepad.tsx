"use client"

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, X, PenLine } from "lucide-react"
import { cn } from "@/lib/utils"

// --- Markdown ↔ Block conversion ---

const BLOCK_SEP = "\n\n---\n\n"

export function blocksToMarkdown(blocks: string[]): string {
  return blocks.filter(b => b.trim()).join(BLOCK_SEP)
}

export function markdownToBlocks(md: string): string[] {
  if (!md.trim()) return []
  return md.split(/\n{0,2}---\n{0,2}/).filter(b => b.trim())
}

// --- Types ---

export interface BlockNotepadHandle {
  flush: () => string
  focus: () => void
}

interface BlockNotepadProps {
  blocks: string[]
  onChange: (blocks: string[]) => void
  onPendingChange?: (hasPending: boolean) => void
  placeholder?: string
}

// --- Sortable Block Card ---

function SortableBlock({
  id, index, text, onDelete, onEdit,
}: {
  id: string; index: number; text: string
  onDelete: () => void; onEdit: (newText: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(text)
  const editRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) {
      editRef.current?.focus()
      const len = editRef.current?.value.length ?? 0
      editRef.current?.setSelectionRange(len, len)
    }
  }, [editing])

  const commitEdit = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== text) onEdit(trimmed)
    else setEditValue(text)
    setEditing(false)
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative border-b border-warm-200/40 bg-transparent animate-in fade-in-0 slide-in-from-bottom-1 duration-200 hover:bg-warm-50/50 transition-colors",
        isDragging && "opacity-50 shadow-lg z-10 bg-white rounded-lg"
      )}
    >
      <div className="flex">
        {/* Drag handle + block number */}
        <div
          {...attributes}
          {...listeners}
          className="flex flex-col items-center pt-2 w-7 shrink-0 cursor-grab active:cursor-grabbing"
        >
          <span className="text-[9px] font-mono text-muted-foreground/25 select-none leading-[28px]">
            {index + 1}
          </span>
          <GripVertical className="w-2.5 h-2.5 text-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 py-1.5 pr-6">
          {editing ? (
            <textarea
              ref={editRef}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit() }
                if (e.key === "Escape") { setEditValue(text); setEditing(false) }
              }}
              className="w-full text-[14px] leading-[28px] bg-transparent border-0 outline-none resize-none p-0 text-foreground"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
          ) : (
            <p
              onClick={() => { setEditValue(text); setEditing(true) }}
              className="text-[14px] leading-[28px] text-stone-700 whitespace-pre-wrap cursor-text select-text"
            >
              {text}
            </p>
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={onDelete}
          className="absolute top-1.5 right-1.5 p-0.5 rounded opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-red-500 transition-all"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// --- Main Component ---

export const BlockNotepad = forwardRef<BlockNotepadHandle, BlockNotepadProps>(
  function BlockNotepad({ blocks, onChange, onPendingChange, placeholder = "Gözlemlerinizi not edin..." }, ref) {
    const [inputValue, setInputValue] = useState("")
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const listEndRef = useRef<HTMLDivElement>(null)
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

    // Expose flush + focus to parent
    useImperativeHandle(ref, () => ({
      flush: () => {
        const pending = inputValue.trim()
        if (pending) {
          onChange([...blocks, pending])
          setInputValue("")
        }
        return pending
      },
      focus: () => inputRef.current?.focus(),
    }))

    // Notify parent when pending input changes
    useEffect(() => {
      onPendingChange?.(inputValue.trim().length > 0)
    }, [inputValue, onPendingChange])

    // Auto-scroll to bottom when new block added
    useEffect(() => {
      listEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [blocks.length])

    const commitBlock = useCallback(() => {
      const text = inputValue.trim()
      if (!text) return
      onChange([...blocks, text])
      setInputValue("")
      setTimeout(() => inputRef.current?.focus(), 0)
    }, [inputValue, blocks, onChange])

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        commitBlock()
      }
      // Backspace boş input'ta → son bloğu input'a geri al
      if (e.key === "Backspace" && !inputValue && blocks.length > 0) {
        e.preventDefault()
        const lastBlock = blocks[blocks.length - 1]
        onChange(blocks.slice(0, -1))
        setInputValue(lastBlock)
        // Cursor'ı sona taşı
        setTimeout(() => {
          const el = inputRef.current
          if (el) { el.selectionStart = el.selectionEnd = lastBlock.length }
        }, 0)
      }
    }, [commitBlock, inputValue, blocks, onChange])

    const handleDragEnd = useCallback((event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIdx = blocks.findIndex((_, i) => `block-${i}` === active.id)
        const newIdx = blocks.findIndex((_, i) => `block-${i}` === over.id)
        if (oldIdx !== -1 && newIdx !== -1) {
          onChange(arrayMove(blocks, oldIdx, newIdx))
        }
      }
    }, [blocks, onChange])

    const deleteBlock = useCallback((idx: number) => {
      onChange(blocks.filter((_, i) => i !== idx))
    }, [blocks, onChange])

    const editBlock = useCallback((idx: number, newText: string) => {
      const updated = [...blocks]
      updated[idx] = newText
      onChange(updated)
    }, [blocks, onChange])

    const blockIds = blocks.map((_, i) => `block-${i}`)

    return (
      <div className="flex flex-col h-full">
        {/* Block list with notebook lines */}
        <div className="flex-1 min-h-0 overflow-y-auto notebook-lines pt-3 pr-3 relative">
          {blocks.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
                {blocks.map((text, i) => (
                  <SortableBlock
                    key={`block-${i}`}
                    id={`block-${i}`}
                    index={i}
                    text={text}
                    onDelete={() => deleteBlock(i)}
                    onEdit={(newText) => editBlock(i, newText)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            /* Empty state — "SEANS NOTU" watermark */
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <PenLine className="w-8 h-8 text-warm-200/60 mb-2" />
              <span className="text-[11px] uppercase tracking-[0.25em] text-warm-200/80 font-medium">
                Seans Notu
              </span>
            </div>
          )}

          {/* Inline input — defterin içinde, blokların devamında */}
          <div className="relative flex items-start gap-1 mt-1 pb-4">
            <PenLine className="w-3 h-3 text-primary/20 mt-[7px] shrink-0" />
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 text-[14px] leading-[28px] bg-transparent border-0 border-b border-transparent focus:border-primary/20 px-1 py-0.5 pr-8 resize-none outline-none transition-colors placeholder:text-warm-300/60 placeholder:italic"
              rows={1}
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            {inputValue.trim() && (
              <button
                onClick={commitBlock}
                className="absolute right-1 top-1 text-[10px] text-primary/50 hover:text-primary font-medium transition-colors"
              >
                ↵
              </button>
            )}
          </div>
          <div ref={listEndRef} />
        </div>
      </div>
    )
  }
)
