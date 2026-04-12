import { streamAIResponse, AIModel } from './aiClient'
import { handleRagMemory } from '../ipc/handlers/ragMemoryHandler'

interface RAGInput {
  message: string
  model: AIModel
  history: Array<{ role: string; content: string }>
  onToken?: (token: string) => void
}

const RAG_SYSTEM = `You are ZETA Memory — a document intelligence agent with access to indexed local files and knowledge bases.

You answer questions using retrieved context from the user's documents. You must:
1. Ground your answers strictly in the provided context
2. Quote relevant passages when helpful
3. Cite the source file for each piece of information
4. Say "I couldn't find this in your documents" if the context doesn't contain the answer
5. Suggest what documents the user might add to improve your knowledge

Be precise. Be accurate. Never hallucinate document contents.`

export const RAGMemoryAgent = {
  async run(input: RAGInput): Promise<{ response: string; artifacts?: unknown[] }> {
    const { message, model, history, onToken } = input

    // Query the vector store
    const queryResult = await handleRagMemory('query', {
      query: message,
      topK: 6
    })

    let ragContext = ''
    const artifacts: unknown[] = []

    if (queryResult.success && queryResult.data) {
      const results = queryResult.data as Array<{ text: string; source: string; score: number }>
      const relevant = results.filter((r) => r.score > 0.1)

      if (relevant.length > 0) {
        ragContext = relevant
          .map((r, i) => `[Context ${i + 1}] (Source: ${r.source}, Score: ${r.score.toFixed(3)})\n${r.text}`)
          .join('\n\n---\n\n')
        artifacts.push({ type: 'rag_results', results: relevant })
      }
    }

    const augmentedMessage = ragContext
      ? `User question: ${message}\n\n--- Retrieved Document Context ---\n${ragContext}`
      : message

    const messages = [
      ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: augmentedMessage }
    ]

    const response = await streamAIResponse({
      model,
      systemPrompt: RAG_SYSTEM,
      messages,
      onToken,
      temperature: 0.3
    })

    return { response, artifacts }
  }
}
