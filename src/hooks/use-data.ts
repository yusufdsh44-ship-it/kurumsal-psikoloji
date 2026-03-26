"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { CollectionName, CollectionType } from "@/types"

async function fetchCollection<K extends CollectionName>(name: K): Promise<CollectionType[K][]> {
  const res = await fetch(`/api/data/${name}`)
  if (!res.ok) throw new Error(`Failed to fetch ${name}`)
  return res.json()
}

async function fetchRecord<K extends CollectionName>(name: K, id: string): Promise<CollectionType[K]> {
  const res = await fetch(`/api/data/${name}?id=${id}`)
  if (!res.ok) throw new Error(`Failed to fetch ${name}/${id}`)
  return res.json()
}

async function createRecord<K extends CollectionName>(name: K, data: CollectionType[K]): Promise<CollectionType[K]> {
  const res = await fetch(`/api/data/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to create ${name}`)
  return res.json()
}

async function updateRecord<K extends CollectionName>(name: K, id: string, data: Partial<CollectionType[K]>): Promise<CollectionType[K]> {
  const res = await fetch(`/api/data/${name}?id=${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to update ${name}/${id}`)
  return res.json()
}

async function deleteRecord<K extends CollectionName>(name: K, id: string): Promise<void> {
  const res = await fetch(`/api/data/${name}?id=${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error(`Failed to delete ${name}/${id}`)
}

export function useCollection<K extends CollectionName>(name: K) {
  return useQuery({
    queryKey: [name],
    queryFn: () => fetchCollection(name),
    staleTime: 5 * 60 * 1000,
  })
}

export function useRecord<K extends CollectionName>(name: K, id: string | undefined) {
  return useQuery({
    queryKey: [name, id],
    queryFn: () => fetchRecord(name, id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateRecord<K extends CollectionName>(name: K) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CollectionType[K]) => createRecord(name, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [name] }) },
  })
}

export function useUpdateRecord<K extends CollectionName>(name: K) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CollectionType[K]> }) => updateRecord(name, id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [name] }) },
  })
}

export function useDeleteRecord<K extends CollectionName>(name: K) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteRecord(name, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [name] }) },
  })
}

export function useSyncAll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/sync")
      if (!res.ok) throw new Error("Sync failed")
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries()
    },
  })
}

export function useReport(slug: string | undefined) {
  return useQuery({
    queryKey: ["rapor", slug],
    queryFn: async () => {
      const res = await fetch(`/api/raporlar/${slug}`)
      if (!res.ok) return null
      const data = await res.json()
      return data.content as string
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ slug, content }: { slug: string; content: string }) => {
      const res = await fetch(`/api/raporlar/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error("Failed to save report")
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["rapor", vars.slug] })
    },
  })
}
