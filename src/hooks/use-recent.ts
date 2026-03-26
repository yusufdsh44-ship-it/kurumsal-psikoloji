"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface RecentItem {
  id: string
  adSoyad: string
  triyajKademesi: number | null
}

const DEFAULT_SECTION_ORDER = ["testler", "gorusmeler", "seans-plani", "klinik-ozet", "anket", "kunye"]

interface RecentStore {
  recentDanisanlar: RecentItem[]
  sidebarCollapsed: boolean
  sectionOrder: string[]
  addRecent: (item: RecentItem) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  setSectionOrder: (order: string[]) => void
}

export const useAppStore = create<RecentStore>()(
  persist(
    (set) => ({
      recentDanisanlar: [],
      sidebarCollapsed: false,
      sectionOrder: DEFAULT_SECTION_ORDER,
      addRecent: (item) =>
        set((state) => {
          const filtered = state.recentDanisanlar.filter((d) => d.id !== item.id)
          return { recentDanisanlar: [item, ...filtered].slice(0, 5) }
        }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setSectionOrder: (order) => set({ sectionOrder: order }),
    }),
    {
      name: "kpb-app-store",
      version: 2,
      migrate: (_persisted, version) => {
        const state = _persisted as Record<string, unknown>
        if (version < 2) {
          return { ...state, sectionOrder: DEFAULT_SECTION_ORDER }
        }
        return state
      },
    }
  )
)
