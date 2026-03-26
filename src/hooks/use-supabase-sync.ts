"use client"

import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"

export function useSupabaseSync() {
  const qc = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    // randevu_talepleri tablosunu dinle
    const channel = supabase
      .channel("realtime-talepler")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "randevu_talepleri" },
        async () => {
          // Yeni talep geldi veya durum değişti → local JSON'ı güncelle
          await fetch("/api/sync-supabase")
          // TanStack Query cache'ini invalidate et
          qc.invalidateQueries({ queryKey: ["randevuTalepleri"] })
        }
      )
      .subscribe()

    channelRef.current = channel

    // İlk açılışta bir kez sync yap
    fetch("/api/sync-supabase").then(() => {
      qc.invalidateQueries({ queryKey: ["randevuTalepleri"] })
    })

    return () => {
      channel.unsubscribe()
    }
  }, [qc])
}
