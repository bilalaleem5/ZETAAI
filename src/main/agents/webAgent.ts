import { streamAIResponse, AIModel } from './aiClient'
import { handleWebIntelligence } from '../ipc/handlers/webIntelligenceHandler'

interface WebAgentInput {
  message: string
  model: AIModel
  history: Array<{ role: string; content: string }>
  onToken?: (token: string) => void
}

const WEB_SYSTEM = `You are ZETA Web Intelligence — an autonomous research agent that searches and synthesizes real-time information from the web.

You have already retrieved web search results and/or page content. Your job is to:
1. Synthesize the information clearly and accurately
2. Cite sources inline where relevant using [Source: URL] format
3. Highlight key facts and insights
4. Be direct — no filler text

If the user asks a question, answer it directly using the retrieved context.
If no context was retrieved, say so clearly and answer from your knowledge.`

export const WebIntelligenceAgent = {
  async run(input: WebAgentInput): Promise<{ response: string; artifacts?: unknown[] }> {
    const { message, model, history, onToken } = input

    let webContext = ''
    const artifacts: unknown[] = []

    // Always search the web
    const searchResult = await handleWebIntelligence('search', { query: message })
    if (searchResult.success && searchResult.data) {
      const results = searchResult.data as Array<{ title: string; url: string; snippet: string }>
      webContext = results
        .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`)
        .join('\n\n')
      artifacts.push({ type: 'search_results', results })
    }

    // If a URL is in the message, scrape it too
    const urlMatch = message.match(/https?:\/\/[^\s]+/)
    if (urlMatch) {
      const scrapeResult = await handleWebIntelligence('scrape', { url: urlMatch[0] })
      if (scrapeResult.success && scrapeResult.data) {
        webContext += `\n\nFull page content from ${urlMatch[0]}:\n${scrapeResult.data}`
        artifacts.push({ type: 'scraped_page', url: urlMatch[0] })
      }
    }

    const augmentedMessage = webContext
      ? `User question: ${message}\n\n--- Web Context ---\n${webContext}`
      : message

    const messages = [
      ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: augmentedMessage }
    ]

    const response = await streamAIResponse({
      model,
      systemPrompt: WEB_SYSTEM,
      messages,
      onToken,
      temperature: 0.4
    })

    return { response, artifacts }
  }
}
