import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const SESSION_FILE = path.join(process.cwd(), "data", "transcripts", "active_session.json")

// GET — Read active session
export async function GET() {
  try {
    const content = await fs.readFile(SESSION_FILE, "utf-8")
    return NextResponse.json(JSON.parse(content))
  } catch {
    return NextResponse.json(null)
  }
}

// POST — Write active session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    await fs.mkdir(path.dirname(SESSION_FILE), { recursive: true })
    await fs.writeFile(SESSION_FILE, JSON.stringify(body, null, 2), "utf-8")
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// DELETE — Clear active session
export async function DELETE() {
  try {
    await fs.unlink(SESSION_FILE)
  } catch {
    // File doesn't exist, fine
  }
  return NextResponse.json({ ok: true })
}
