import { GoogleGenAI } from '@google/genai'
import Groq from 'groq-sdk'

export type AIModel = 'gemini' | 'groq'

export interface StreamOptions {
  model: AIModel
  systemPrompt: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  onToken?: (token: string) => void
  maxTokens?: number
  temperature?: number
}

export async function streamAIResponse(options: StreamOptions): Promise<string> {
  const { model, systemPrompt, messages, onToken, maxTokens = 4096, temperature = 0.7 } = options

  if (model === 'gemini') {
    return streamGemini({ systemPrompt, messages, onToken, maxTokens, temperature })
  } else {
    return streamGroq({ systemPrompt, messages, onToken, maxTokens, temperature })
  }
}

async function streamGemini(options: Omit<StreamOptions, 'model'>): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY not configured. Go to Settings → Vault to add your key.')
  }

  const genai = new GoogleGenAI({ apiKey })
  const { systemPrompt, messages, onToken, maxTokens, temperature } = options

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))

  const stream = genai.models.generateContentStream({
    model: 'gemini-2.0-flash',
    contents,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: maxTokens,
      temperature
    }
  })

  let fullText = ''
  for await (const chunk of await stream) {
    const token = chunk.text ?? ''
    fullText += token
    if (onToken && token) onToken(token)
  }
  return fullText
}

async function streamGroq(options: Omit<StreamOptions, 'model'>): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    throw new Error('GROQ_API_KEY not configured. Go to Settings → Vault to add your key.')
  }

  const groq = new Groq({ apiKey })
  const { systemPrompt, messages, onToken, maxTokens, temperature } = options

  const groqMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  ]

  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: groqMessages,
    max_tokens: maxTokens,
    temperature,
    stream: true
  })

  let fullText = ''
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? ''
    fullText += token
    if (onToken && token) onToken(token)
  }
  return fullText
}

export async function callAI(options: Omit<StreamOptions, 'onToken'>): Promise<string> {
  return streamAIResponse({ ...options, onToken: undefined })
}
