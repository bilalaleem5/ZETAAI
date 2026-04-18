import Groq from 'groq-sdk'

export type AIModel = 'groq'

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
  if (!key || key.length < 20) {
    console.error('[AI] ❌ GROQ_API_KEY missing or too short. Length:', key.length)
    throw new Error('GROQ_API_KEY not configured — add it in VAULT settings')
  }

  console.log('[AI] Key prefix:', key.slice(0, 8) + '..., length:', key.length)
  const groq = new Groq({ apiKey: key })
  const { systemPrompt, messages, onToken, maxTokens = 2048, temperature = 0.7, responseFormat } = opts

  for (const model of MODELS) {
    try {
      console.log(`[AI] Trying model: ${model}`)
      const reqMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      ]

      const createOpts: any = {
        model,
        messages: reqMessages,
        max_tokens: maxTokens,
        temperature,
        stream: true
      }
      if (responseFormat) createOpts.response_format = responseFormat

      const stream = await groq.chat.completions.create(createOpts)
      let full = ''
      for await (const chunk of stream) {
        const t = chunk.choices[0]?.delta?.content ?? ''
        if (t) { full += t; onToken?.(t) }
      }
      console.log(`[AI] ✅ ${model} — ${full.length} chars`)
      return full
    } catch (e: any) {
      const msg = String(e?.message || e)
      console.error(`[AI] ❌ ${model}:`, msg.slice(0, 150))

      // Auth errors — don't retry other models, key is bad
      if (msg.includes('401') || msg.includes('Invalid') || msg.includes('Unauthorized') || msg.includes('invalid_api_key')) {
        throw new Error('Groq API key is invalid. Please update it in VAULT.')
      }
      // Rate limiting — try next model
      if (msg.includes('429') || msg.includes('rate') || msg.includes('Rate')) {
        console.warn(`[AI] ${model} rate limited, trying next model...`)
        continue
      }
      // Model not found — try next
      if (msg.includes('model_not_found') || msg.includes('does not exist')) {
        console.warn(`[AI] ${model} not available, trying next...`)
        continue
      }
      // Other errors — throw
      throw e
    }
  }
  throw new Error('All Groq models unavailable — try again in a moment')
}

export const callAI = (opts: Omit<StreamOptions, 'onToken'>) => streamAIResponse({ ...opts })
