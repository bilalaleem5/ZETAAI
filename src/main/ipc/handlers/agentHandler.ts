import { BrowserWindow } from 'electron'
import { ZetaCoderAgent } from '../../agents/coderAgent'
import { WebIntelligenceAgent } from '../../agents/webAgent'
import { RAGMemoryAgent } from '../../agents/ragAgent'
import { WebsiteBuilderAgent } from '../../agents/websiteBuilderAgent'
import { OrchestratorAgent } from '../../agents/orchestratorAgent'
import { ConversationAgent } from '../../agents/conversationAgent'

export interface AgentPayload {
  message: string
  model: 'gemini' | 'groq'
  agentMode: 'auto' | 'coder' | 'web' | 'rag' | 'builder' | 'os' | 'chat'
  conversationHistory: Array<{ role: string; content: string }>
  context?: Record<string, unknown>
}

export async function handleAgentChat(payload: AgentPayload, win: BrowserWindow) {
  const tx = (ch: string, d: unknown) => { try { if (!win.isDestroyed()) win.webContents.send(ch, d) } catch {} }
  const tok  = (t: string) => tx('agent:stream-token', { token: t })
  const done = ()           => tx('agent:stream-complete', { metadata: null })

  try {
    const { message, agentMode, conversationHistory, context } = payload
    const model = 'groq' as const
    console.log(`[Agent] ${agentMode} → "${message.slice(0, 60)}"`)

    let result: { response: string; artifacts?: unknown[] }
    switch (agentMode) {
      case 'coder':   result = await ZetaCoderAgent.run({ message, model, history: conversationHistory, onToken: tok }); break
      case 'web':     result = await WebIntelligenceAgent.run({ message, model, history: conversationHistory, onToken: tok }); break
      case 'rag':     result = await RAGMemoryAgent.run({ message, model, history: conversationHistory, onToken: tok }); break
      case 'builder': result = await WebsiteBuilderAgent.run({ message, model, history: conversationHistory, onToken: tok }); break
      case 'chat':    result = await ConversationAgent.run({ message, model, history: conversationHistory, onToken: tok }); break
      case 'os':      result = await OrchestratorAgent.run({ message, model, history: conversationHistory, context: context || {}, onToken: tok }); break
      default:        result = await OrchestratorAgent.run({ message, model, history: conversationHistory, context: context || {}, onToken: tok }); break
    }
    done()
    return { success: true, response: result.response }
  } catch (err) {
    const raw = String(err instanceof Error ? err.message : err)
    console.error('[Agent] ❌', raw.slice(0, 200))
    let msg = '⚠️ Error. Please try again.'
    if (raw.includes('GROQ_API_KEY') || raw.includes('not configured')) msg = '🔑 Add GROQ_API_KEY in VAULT (console.groq.com)'
    else if (raw.includes('401') || raw.includes('Invalid') || raw.includes('Unauthorized')) msg = '🔑 Groq API key invalid. Update in VAULT.'
    else if (raw.includes('429') || raw.includes('rate')) msg = '⏳ Rate limited. Wait a moment.'
    tok(msg)
    done()   // ← CRITICAL: always unblocks the frontend
    return { success: false, error: msg }
  }
}
