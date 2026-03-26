"use client"

import { useState, useCallback, type ReactNode } from "react"
import { Sidebar } from "./sidebar"
import { CommandPalette } from "./command-palette"
import { useFileSync } from "@/hooks/use-file-sync"
import { useSupabaseSync } from "@/hooks/use-supabase-sync"

export function AppShell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)
  useFileSync()
  useSupabaseSync()

  const handleOpenSearch = useCallback(() => setSearchOpen(true), [])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onOpenSearch={handleOpenSearch} />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="px-6 pt-3 pb-6 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
