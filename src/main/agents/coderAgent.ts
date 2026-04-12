import { streamAIResponse, AIModel } from './aiClient'
import { handleFileSystem } from '../ipc/handlers/fileSystemHandler'
import path from 'path'
import os from 'os'

interface CoderInput {
  message: string
  model: AIModel
  history: Array<{ role: string; content: string }>
  onToken?: (token: string) => void
}

const CODER_SYSTEM = `You are ZETA Coder — an autonomous coding engine that writes production-quality code and saves it directly to disk.

When the user asks you to write code or create a file:
1. Write the complete, working code
2. At the END of your response, include a file save instruction in this exact format:

[SAVE_FILE]
path: <relative or absolute path>
language: <language>
[/SAVE_FILE]

Rules:
- Always write complete files, never truncated code
- Include all imports and proper error handling
- Use modern syntax and best practices
- For web projects, include CSS and JS in a single file unless told otherwise
- After saving, tell the user where the file was saved
- Default save directory: ~/ZetaAI/projects/`

export const ZetaCoderAgent = {
  async run(input: CoderInput): Promise<{ response: string; artifacts?: unknown[] }> {
    const { message, model, history, onToken } = input

    const messages = [
      ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: message }
    ]

    const response = await streamAIResponse({
      model,
      systemPrompt: CODER_SYSTEM,
      messages,
      onToken,
      temperature: 0.2,
      maxTokens: 8192
    })

    const artifacts: unknown[] = []

    // Extract code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const saveFileRegex = /\[SAVE_FILE\]\s*path:\s*(.+?)\s*language:\s*(.+?)\s*\[\/SAVE_FILE\]/g

    let saveMatch: RegExpExecArray | null
    let codeBlockIndex = 0
    const codeBlocks: Array<{ lang: string; code: string }> = []

    let match: RegExpExecArray | null
    while ((match = codeBlockRegex.exec(response)) !== null) {
      codeBlocks.push({ lang: match[1] ?? 'text', code: match[2] })
    }

    while ((saveMatch = saveFileRegex.exec(response)) !== null) {
      const rawPath = saveMatch[1].trim()
      const filePath = rawPath.startsWith('~')
        ? path.join(os.homedir(), rawPath.slice(1))
        : rawPath.startsWith('/')
        ? rawPath
        : path.join(os.homedir(), 'ZetaAI', 'projects', rawPath)

      const code = codeBlocks[codeBlockIndex]?.code ?? ''
      if (code) {
        await handleFileSystem('write', { filePath, content: code })
        artifacts.push({ type: 'file_written', path: filePath, language: saveMatch[2].trim() })
        codeBlockIndex++
      }
    }

    // Auto-save if no explicit save instruction but code was requested
    if (artifacts.length === 0 && codeBlocks.length > 0 && message.toLowerCase().match(/create|write|build|make|generate/)) {
      const ext = langToExt(codeBlocks[0].lang)
      const defaultPath = path.join(os.homedir(), 'ZetaAI', 'projects', `zeta_output${ext}`)
      await handleFileSystem('write', { filePath: defaultPath, content: codeBlocks[0].code })
      artifacts.push({ type: 'file_written', path: defaultPath, language: codeBlocks[0].lang })
    }

    return { response, artifacts }
  }
}

function langToExt(lang: string): string {
  const map: Record<string, string> = {
    typescript: '.ts', javascript: '.js', python: '.py',
    html: '.html', css: '.css', json: '.json', bash: '.sh',
    rust: '.rs', go: '.go', java: '.java', cpp: '.cpp', c: '.c'
  }
  return map[lang.toLowerCase()] ?? '.txt'
}
