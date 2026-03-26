import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')

/** Verilen dosya yolunun belirtilen dizin içinde kaldığını doğrula */
function assertWithinDir(baseDir: string, filePath: string): string {
  const resolved = path.resolve(baseDir, filePath)
  if (!resolved.startsWith(path.resolve(baseDir) + path.sep) && resolved !== path.resolve(baseDir)) {
    throw new Error('Path traversal detected')
  }
  return resolved
}

export async function readCollection<T>(name: string): Promise<T[]> {
  try {
    const content = await fs.readFile(path.join(DATA_DIR, `${name}.json`), 'utf-8')
    return JSON.parse(content)
  } catch {
    return []
  }
}

export async function writeCollection<T>(name: string, data: T[]): Promise<void> {
  await fs.writeFile(path.join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2), 'utf-8')
}

export async function readMarkdownReport(slug: string): Promise<string | null> {
  try {
    const fullPath = assertWithinDir(path.join(DATA_DIR, 'raporlar'), `${slug}.md`)
    return await fs.readFile(fullPath, 'utf-8')
  } catch {
    return null
  }
}

export async function writeMarkdownReport(slug: string, content: string): Promise<void> {
  const fullPath = assertWithinDir(path.join(DATA_DIR, 'raporlar'), `${slug}.md`)
  await fs.writeFile(fullPath, content, 'utf-8')
}

export async function listReports(): Promise<string[]> {
  try {
    const files = await fs.readdir(path.join(DATA_DIR, 'raporlar'))
    return files.filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
  } catch {
    return []
  }
}

export async function readPdfFile(filePath: string): Promise<Buffer | null> {
  try {
    const fullPath = assertWithinDir(path.join(DATA_DIR, 'pdf'), filePath)
    return await fs.readFile(fullPath)
  } catch {
    return null
  }
}

export async function readAnketRaporuHtml(filename: string): Promise<string | null> {
  try {
    const fullPath = assertWithinDir(path.join(DATA_DIR, 'anket-raporlari'), filename)
    return await fs.readFile(fullPath, 'utf-8')
  } catch {
    return null
  }
}

export async function readFoto(filename: string): Promise<Buffer | null> {
  try {
    const fullPath = assertWithinDir(path.join(DATA_DIR, 'fotos'), filename)
    return await fs.readFile(fullPath)
  } catch {
    return null
  }
}
