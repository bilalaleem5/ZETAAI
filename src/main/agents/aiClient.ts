import Groq from 'groq-sdk'

export type AIModel = 'gemini' | 'groq'

export interface StreamOptions {
  model: AIModel
  systemPrompt: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  onToken?: (token: string) => void
  maxTokens?: number
  temperature?: number
  responseFormat?: { type: 'json_object' } | { type: 'text' }
}

const MODELS = ['llama-3.3-70b-versatile', 'llama3-8b-8192', 'mixtral-8x7b-32768']

export async function streamAIResponse(opts: StreamOptions): Promise<string> {
  const key = (process.env.GROQ_API_KEY || '').trim()
  if (!key || key.length < 20) throw new Error('GROQ_API_KEY not configured')

  const groq = new Groq({ apiKey: key })
  const { systemPrompt, messages, onToken, maxTokens = 2048, temperature = 0.7, responseFormat } = opts

  for (const model of MODELS) {
    try {
      const stream = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
        ],
        max_tokens: maxTokens,
        temperature,
        ...(responseFormat ? { response_format: responseFormat } : {}),
        stream: true
      })
      let full = ''
      for await (const chunk of stream) {
        const t = chunk.choices[0]?.delta?.content ?? ''
        if (t) { full += t; onToken?.(t) }
      }
      console.log(`[AI] ✅ ${model}`)
      return full
    } catch (e) {
      const msg = String(e)
      if (msg.includes('401') || msg.includes('Invalid') || msg.includes('Unauthorized')) throw e
      if (msg.includes('429') || msg.includes('rate')) { console.warn(`[AI] ${model} rate limited`); continue }
      throw e
    }
  }
  throw new Error('All Groq models unavailable')
}

export const callAI = (opts: Omit<StreamOptions, 'onToken'>) => streamAIResponse({ ...opts })
