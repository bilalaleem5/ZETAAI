import { promises as fs } from 'fs'
import path from 'path'
import { app } from 'electron'

type RagAction = 'ingest' | 'query' | 'clear'

interface RagPayload {
  filePath?: string
  dirPath?: string
  query?: string
  topK?: number
}

interface VectorEntry {
  id: string
  text: string
  source: string
  embedding?: number[]
}

// Simple in-memory vector store (production: use LanceDB)
let vectorStore: VectorEntry[] = []

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  return dot / (magA * magB)
}

function simpleEmbedding(text: string): number[] {
  // Lightweight TF-based embedding fallback (replace with Xenova in production)
  const words = text.toLowerCase().split(/\W+/).filter(Boolean)
  const vocab: Record<string, number> = {}
  words.forEach((w) => { vocab[w] = (vocab[w] || 0) + 1 })
  const dim = 128
  const vec = new Array(dim).fill(0)
  Object.entries(vocab).forEach(([word, count]) => {
    let hash = 0
    for (let i = 0; i < word.length; i++) hash = (hash * 31 + word.charCodeAt(i)) % dim
    vec[Math.abs(hash)] += count
  })
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1
  return vec.map((v) => v / mag)
}

function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = []
  const words = text.split(/\s+/)
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    chunks.push(words.slice(i, i + chunkSize).join(' '))
    if (i + chunkSize >= words.length) break
  }
  return chunks
}

async function readFileContent(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase()
  const buffer = await fs.readFile(filePath)

  if (ext === '.txt' || ext === '.md' || ext === '.ts' || ext === '.js' ||
      ext === '.py' || ext === '.json' || ext === '.html' || ext === '.css') {
    return buffer.toString('utf-8')
  }
  if (ext === '.pdf') {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return data.text
  }
  if (ext === '.docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  return buffer.toString('utf-8')
}

export async function handleRagMemory(
  action: RagAction,
  payload: RagPayload
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (action) {
      case 'ingest': {
        let files: string[] = []

        if (payload.filePath) {
          files = [payload.filePath]
        } else if (payload.dirPath) {
          const walk = async (dir: string): Promise<string[]> => {
            const entries = await fs.readdir(dir, { withFileTypes: true })
            const paths: string[] = []
            for (const e of entries) {
              const full = path.join(dir, e.name)
              if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
                paths.push(...(await walk(full)))
              } else if (e.isFile()) {
                paths.push(full)
              }
            }
            return paths
          }
          files = await walk(payload.dirPath)
        }

        let ingested = 0
        for (const file of files) {
          try {
            const content = await readFileContent(file)
            const chunks = chunkText(content)
            for (const chunk of chunks) {
              vectorStore.push({
                id: `${file}:${ingested++}`,
                text: chunk,
                source: file,
                embedding: simpleEmbedding(chunk)
              })
            }
          } catch {
            // Skip unreadable files silently
          }
        }

        return { success: true, data: { ingested: vectorStore.length, files: files.length } }
      }

      case 'query': {
        if (!payload.query) return { success: false, error: 'Query required' }
        const topK = payload.topK ?? 5
        const queryEmb = simpleEmbedding(payload.query)

        const scored = vectorStore.map((entry) => ({
          ...entry,
          score: entry.embedding ? cosineSimilarity(queryEmb, entry.embedding) : 0
        }))

        scored.sort((a, b) => b.score - a.score)
        const results = scored.slice(0, topK).map(({ id, text, source, score }) => ({
          id, text, source, score
        }))

        return { success: true, data: results }
      }

      case 'clear': {
        vectorStore = []
        return { success: true, data: { cleared: true } }
      }

      default:
        return { success: false, error: `Unknown RAG action: ${action}` }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error(`[RAGMemory:${action}] Error:`, errMsg)
    return { success: false, error: errMsg }
  }
}
