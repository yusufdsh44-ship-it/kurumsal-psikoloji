"use client"

import { useMemo } from "react"
import { useCollection } from "./use-data"
import type { Danisan, Mudurluk } from "@/types"

export function useDanisanlar() {
  return useCollection("danisanlar")
}

export function useMudurlukler() {
  return useCollection("mudurlukler")
}

export function useMudurlukMap() {
  const { data: mudurlukler } = useMudurlukler()
  return useMemo(() => {
    const map = new Map<string, Mudurluk>()
    mudurlukler?.forEach(m => map.set(m.id, m))
    return map
  }, [mudurlukler])
}

export function useFilteredDanisanlar(filters: {
  search?: string
  kseKademe?: string[]
  bfiKademe?: string[]
  mudurlukId?: string
  durum?: string
  sortBy?: string
  sortDir?: "asc" | "desc"
}) {
  const { data: danisanlar, ...rest } = useDanisanlar()
  const mudurlukMap = useMudurlukMap()

  const filtered = useMemo(() => {
    if (!danisanlar) return []
    let result = [...danisanlar]

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(d =>
        d.adSoyad.toLowerCase().includes(q) ||
        d.sicilNo.toString().includes(q) ||
        mudurlukMap.get(d.mudurlukId)?.mudurlukAdi.toLowerCase().includes(q)
      )
    }

    if (filters.kseKademe?.length) {
      result = result.filter(d => d.kseKademe !== null && filters.kseKademe!.includes(d.kseKademe))
    }

    if (filters.bfiKademe?.length) {
      result = result.filter(d => d.bfiKademe !== null && filters.bfiKademe!.includes(d.bfiKademe))
    }

    if (filters.mudurlukId) {
      result = result.filter(d => d.mudurlukId === filters.mudurlukId)
    }

    if (filters.durum) {
      result = result.filter(d => d.genelDurum === filters.durum)
    }

    const dir = filters.sortDir === "desc" ? -1 : 1
    const key = filters.sortBy || "triyajKademesi"
    result.sort((a, b) => {
      const aVal = a[key as keyof Danisan]
      const bVal = b[key as keyof Danisan]
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      if (aVal < bVal) return -1 * dir
      if (aVal > bVal) return 1 * dir
      return 0
    })

    return result
  }, [danisanlar, filters.search, filters.kseKademe, filters.bfiKademe, filters.mudurlukId, filters.durum, filters.sortBy, filters.sortDir, mudurlukMap])

  return { data: filtered, allData: danisanlar, ...rest }
}

export function useDanisanWithRelations(id: string | undefined) {
  const { data: danisanlar } = useDanisanlar()
  const { data: mudurlukler } = useMudurlukler()
  const { data: testler } = useCollection("testSonuclari")
  const { data: planlar } = useCollection("seansPlanlari")
  const { data: notlar } = useCollection("gorusmeNotlari")

  return useMemo(() => {
    if (!id || !danisanlar) return null
    const danisan = danisanlar.find(d => d.id === id)
    if (!danisan) return null
    const mudurluk = mudurlukler?.find(m => m.id === danisan.mudurlukId) ?? null
    const danisanTestleri = testler?.filter(t => t.danisanId === id) ?? []
    const danisanPlanlari = planlar?.filter(p => p.danisanId === id) ?? []
    const danisanNotlari = notlar?.filter(n => n.danisanId === id).sort((a, b) =>
      new Date(b.tarih).getTime() - new Date(a.tarih).getTime()
    ) ?? []

    return { danisan, mudurluk, testler: danisanTestleri, planlar: danisanPlanlari, notlar: danisanNotlari }
  }, [id, danisanlar, mudurlukler, testler, planlar, notlar])
}
