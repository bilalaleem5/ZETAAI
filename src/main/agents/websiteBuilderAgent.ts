import { streamAIResponse, AIModel } from './aiClient'
import { handleFileSystem } from '../ipc/handlers/fileSystemHandler'
import path from 'path'
import os from 'os'

interface BuilderInput {
  message: string
  model: AIModel
  history: Array<{ role: string; content: string }>
  onToken?: (token: string) => void
}

const BUILDER_SYSTEM = `You are ZETA Website Builder — an autonomous web development agent that generates complete, production-ready websites in a single HTML file.

Rules (STRICT):
1. Output ONE complete HTML file with all CSS and JavaScript inline
2. Use modern, responsive design — mobile-first
3. Include smooth animations and transitions
4. Use a professional color scheme unless specified
5. Make it look like a real, polished product — not a demo
6. Include all content the user asked for
7. NO placeholder text like "Lorem ipsum" — use real, relevant content
8. The HTML must be valid and immediately renderable in a browser

Tech allowed (via CDN only):
- Tailwind CSS: https://cdn.tailwindcss.com
- Alpine.js: https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js
- Font Awesome: https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css
- Google Fonts: https://fonts.googleapis.com

Output format: Start with <!DOCTYPE html> and end with </html>. Nothing before or after.
After the HTML, add on a new line: [SITE_SAVED_TO: ~/ZetaAI/websites/<filename>.html]`

export const WebsiteBuilderAgent = {
  async run(input: BuilderInput): Promise<{ response: string; artifacts?: unknown[] }> {
    const { message, model, history, onToken } = input

    // Extract site name from message
    const nameMatch = message.match(/(?:for|called|named|about)\s+["']?([a-zA-Z0-9 ]+)["']?/i)
    const siteName = nameMatch
      ? nameMatch[1].trim().toLowerCase().replace(/\s+/g, '-')
      : 'zeta-site'

    const messages = [
      ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: message }
    ]

    const response = await streamAIResponse({
      model,
      systemPrompt: BUILDER_SYSTEM,
      messages,
      onToken,
      temperature: 0.6,
      maxTokens: 8192
    })

    const artifacts: unknown[] = []

    // Extract the HTML
    const htmlStart = response.indexOf('<!DOCTYPE html>')
    const htmlEnd = response.lastIndexOf('</html>') + 7
    if (htmlStart !== -1 && htmlEnd > htmlStart) {
      const html = response.slice(htmlStart, htmlEnd)
      const filename = `${siteName}-${Date.now()}.html`
      const filePath = path.join(os.homedir(), 'ZetaAI', 'websites', filename)

      await handleFileSystem('write', { filePath, content: html })
      await handleFileSystem('open-file', { filePath })

      artifacts.push({
        type: 'website_built',
        path: filePath,
        filename,
        preview: html.slice(0, 500) + '...'
      })
    }

    return { response, artifacts }
  }
}
