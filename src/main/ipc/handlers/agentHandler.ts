import { BrowserWindow } from 'electron'
import { ZetaCoderAgent } from '../../agents/coderAgent'
import { WebIntelligenceAgent } from '../../agents/webAgent'
import { RAGMemoryAgent } from '../../agents/ragAgent'
import { WebsiteBuilderAgent } from '../../agents/websiteBuilderAgent'
import { OrchestratorAgent } from '../../agents/orchestratorAgent'

export interface AgentPayload {
  message: string
  model: 'gemini' | 'groq'
  agentMode: 'auto' | 'coder' | 'web' | 'rag' | 'builder' | 'os' | 'chat'
  conversationHistory: Array<{ role: string; content: string }>
  context?: Record<string, unknown>
}

export async function handleAgentChat(
  payload: AgentPayload,
  mainWindow: BrowserWindow
): Promise<{ success: boolean; response?: string; error?: string }> {

  const send = (ch: string, data: unknown) => {
    try { if (!mainWindow.isDestroyed()) mainWindow.webContents.send(ch, data) } catch {}
  }
  const sendToken = (t: string) => send('agent:stream-token', { token: t })
  const sendDone  = ()         => send('agent:stream-complete', { metadata: null })

  try {
    const { message, agentMode, conversationHistory, context } = payload
    const model = 'groq' as const  // Always Groq
    let result: { response: string; artifacts?: unknown[] }

    switch (agentMode) {
      case 'coder':   result = await ZetaCoderAgent.run({ message, model, history: conversationHistory, onToken: sendToken }); break
      case 'web':     result = await WebIntelligenceAgent.run({ message, model, history: conversationHistory, onToken: sendToken }); break
      case 'rag':     result = await RAGMemoryAgent.run({ message, model, history: conversationHistory, onToken: sendToken }); break
      case 'builder': result = await WebsiteBuilderAgent.run({ message, model, history: conversationHistory, onToken: sendToken }); break
      case 'chat':
      default:
        result = await OrchestratorAgent.run({ message, model, history: conversationHistory, context: context || {}, onToken: sendToken })
        break
    }

    sendDone()
    return { success: true, response: result.response }

  } catch (error) {
    const raw = String(error instanceof Error ? error.message : error)
    console.error('[AgentHandler]', raw.slice(0, 200))

    let msg = '⚠️ Error occurred.'
    if (raw.includes('not set') || raw.includes('GROQ_API_KEY')) {
      msg = '🔑 Add GROQ_API_KEY in VAULT'
    } else if (raw.includes('401') || raw.includes('invalid') || raw.includes('unauthorized')) {
      // It's possible that an external API (like weather) threw 401, but usually it's the Groq SDK
      msg = '🔑 Warning: API Key issues. Ensure Groq Key in VAULT is valid.'
    } else if (raw.includes('429') || raw.includes('rate')) {
      msg = '⏳ Rate limited. Wait a moment before next command.'
    }

    sendToken(msg)
    // Add artificial delay before sendDone so the UI can process the text and trigger the TTS sequence properly
    setTimeout(() => sendDone(), 200)
    return { success: false, error: msg }
  }
}
