import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  const { data, error } = await supabase
    .from("test_sonuclari")
    .select("id, ad_soyad, mudurluk, test_turu, tarih, cevaplar")
    .eq("kaynak", "online")
    .order("tarih", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
