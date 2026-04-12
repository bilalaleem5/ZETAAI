import { BrowserWindow } from 'electron'
import { ZetaCoderAgent } from '../agents/coderAgent'
import { WebIntelligenceAgent } from '../agents/webAgent'
import { RAGMemoryAgent } from '../agents/ragAgent'
import { WebsiteBuilderAgent } from '../agents/websiteBuilderAgent'
import { OrchestratorAgent } from '../agents/orchestratorAgent'

export interface AgentPayload {
  message: string
  model: 'gemini' | 'groq'
  agentMode: 'auto' | 'coder' | 'web' | 'rag' | 'builder' | 'os'
  conversationHistory: Array<{ role: string; content: string }>
  context?: Record<string, unknown>
}

export async function handleAgentChat(
  payload: AgentPayload,
  mainWindow: BrowserWindow
): Promise<{ success: boolean; response?: string; error?: string; artifacts?: unknown[] }> {
  try {
    const { message, model, agentMode, conversationHistory, context } = payload

    // Stream token-by-token to frontend
    const streamToken = (token: string): void => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('agent:stream-token', { token })
      }
    }

    const streamComplete = (metadata?: unknown): void => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('agent:stream-complete', { metadata })
      }
    }

    let result: { response: string; artifacts?: unknown[] }

    switch (agentMode) {
      case 'coder':
        result = await ZetaCoderAgent.run({ message, model, history: conversationHistory, onToken: streamToken })
        break
      case 'web':
        result = await WebIntelligenceAgent.run({ message, model, history: conversationHistory, onToken: streamToken })
        break
      case 'rag':
        result = await RAGMemoryAgent.run({ message, model, history: conversationHistory, onToken: streamToken })
        break
      case 'builder':
        result = await WebsiteBuilderAgent.run({ message, model, history: conversationHistory, onToken: streamToken })
        break
      case 'auto':
      default:
        result = await OrchestratorAgent.run({
          message,
          model,
          history: conversationHistory,
          context: context || {},
          onToken: streamToken
        })
        break
    }

    streamComplete(result.artifacts)
    return { success: true, response: result.response, artifacts: result.artifacts }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[AgentHandler] Error:', errMsg)
    return { success: false, error: errMsg }
  }
}
