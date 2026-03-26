"use client"

import { useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useCollection } from "@/hooks/use-data"
import { useMudurlukMap } from "@/hooks/use-danisanlar"
import { getKademeStyle } from "@/lib/triyaj"
import { Users, Building2, Search } from "lucide-react"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const { data: danisanlar } = useCollection("danisanlar")
  const { data: mudurlukler } = useCollection("mudurlukler")
  const mudurlukMap = useMudurlukMap()

  // Cmd+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onOpenChange])

  const handleSelect = useCallback((path: string) => {
    onOpenChange(false)
    router.push(path)
  }, [router, onOpenChange])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Danışan, müdürlük veya sayfa ara..." />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Search className="w-8 h-8" />
            <p>Sonuç bulunamadı</p>
          </div>
        </CommandEmpty>

        <CommandGroup heading="Danışanlar">
          {danisanlar?.map(d => {
            const style = getKademeStyle(d.triyajKademesi)
            const mudurluk = mudurlukMap.get(d.mudurlukId)
            return (
              <CommandItem
                key={d.id}
                value={`${d.adSoyad} ${d.sicilNo} ${mudurluk?.mudurlukAdi ?? ""}`}
                onSelect={() => handleSelect(`/danisanlar/${d.id}`)}>
                <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className="flex-1">{d.adSoyad}</span>
                <span className="text-xs text-muted-foreground mr-2 font-mono">#{d.sicilNo}</span>
                {d.triyajKademesi && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{ background: style.bg, color: style.text }}>
                    K{d.triyajKademesi}
                  </span>
                )}
              </CommandItem>
            )
          })}
        </CommandGroup>

        <CommandGroup heading="Müdürlükler">
          {mudurlukler?.map(m => (
            <CommandItem
              key={m.id}
              value={m.mudurlukAdi}
              onSelect={() => handleSelect(`/mudurlukler/${m.id}`)}>
              <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
              <span className="flex-1">{m.mudurlukAdi}</span>
              <span className="text-xs text-muted-foreground">{m.personelSayisi} kişi</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
