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

const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama3-8b-8192', 'mixtral-8x7b-32768']

export async function streamAIResponse(options: StreamOptions): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey || apiKey.length < 10) {
    throw new Error('GROQ_API_KEY not set. Open VAULT and add your key from console.groq.com')
  }

  const { systemPrompt, messages, onToken, maxTokens = 2048, temperature = 0.7 } = options
  const groq = new Groq({ apiKey })

  for (const modelName of GROQ_MODELS) {
    try {
      const stream = await groq.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
        ],
        max_tokens: maxTokens,
        temperature,
        stream: true
      })
      let full = ''
      for await (const chunk of stream) {
        const t = chunk.choices[0]?.delta?.content ?? ''
        if (t) { full += t; onToken?.(t) }
      }
      console.log(`[AI] ✅ Groq ${modelName}`)
      return full
    } catch (err) {
      const msg = String(err)
      if (msg.includes('429') || msg.includes('rate')) {
        console.warn(`[AI] ${modelName} rate limited, trying next...`)
        continue
      }
      throw err
    }
  }
  throw new Error('All Groq models unavailable. Please try again in a moment.')
}

export async function callAI(options: Omit<StreamOptions, 'onToken'>): Promise<string> {
  return streamAIResponse({ ...options, onToken: undefined })
}
