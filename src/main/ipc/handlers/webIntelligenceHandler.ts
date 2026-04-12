import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import * as cheerio from 'cheerio'

puppeteer.use(StealthPlugin())

type WebAction = 'search' | 'scrape' | 'summarize'

interface WebPayload {
  query?: string
  url?: string
  apiKey?: string
}

// Simple in-memory browser pool
let browserInstance: Awaited<ReturnType<typeof puppeteer.launch>> | null = null

async function getBrowser(): Promise<Awaited<ReturnType<typeof puppeteer.launch>>> {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    })
  }
  return browserInstance
}

export async function handleWebIntelligence(
  action: WebAction,
  payload: WebPayload
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (action) {
      case 'search': {
        // Use Tavily API if key available, else fallback to DuckDuckGo
        const tavilyKey = process.env.TAVILY_API_KEY
        if (tavilyKey && tavilyKey !== 'your_tavily_api_key_here') {
          const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: tavilyKey,
              query: payload.query,
              search_depth: 'advanced',
              max_results: 5
            })
          })
          const data = await res.json()
          return { success: true, data: data.results }
        } else {
          // Fallback: DuckDuckGo HTML scrape
          const browser = await getBrowser()
          const page = await browser.newPage()
          await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
          )
          await page.goto(
            `https://html.duckduckgo.com/html/?q=${encodeURIComponent(payload.query ?? '')}`,
            { waitUntil: 'domcontentloaded' }
          )
          const html = await page.content()
          await page.close()
          const $ = cheerio.load(html)
          const results: { title: string; url: string; snippet: string }[] = []
          $('.result').each((_, el) => {
            const title = $(el).find('.result__title').text().trim()
            const url = $(el).find('.result__url').text().trim()
            const snippet = $(el).find('.result__snippet').text().trim()
            if (title) results.push({ title, url, snippet })
          })
          return { success: true, data: results.slice(0, 5) }
        }
      }

      case 'scrape': {
        const browser = await getBrowser()
        const page = await browser.newPage()
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
        )
        await page.goto(payload.url!, { waitUntil: 'networkidle2', timeout: 30000 })

        // Remove ads, navbars, footers, scripts
        await page.evaluate(() => {
          const selectors = [
            'script', 'style', 'nav', 'footer', 'header', 'aside',
            '.ad', '.advertisement', '.sidebar', '#cookie-notice',
            '[class*="banner"]', '[id*="banner"]'
          ]
          selectors.forEach((sel) => {
            document.querySelectorAll(sel).forEach((el) => el.remove())
          })
        })

        const text = await page.evaluate(() => document.body.innerText)
        await page.close()

        // Truncate to 8000 chars for LLM context
        const cleaned = text.replace(/\s+/g, ' ').trim().slice(0, 8000)
        return { success: true, data: cleaned }
      }

      case 'summarize': {
        // First scrape, then the calling agent will summarize
        const scrapeResult = await handleWebIntelligence('scrape', { url: payload.url })
        return scrapeResult
      }

      default:
        return { success: false, error: `Unknown web action: ${action}` }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error(`[WebIntelligence:${action}] Error:`, errMsg)
    return { success: false, error: errMsg }
  }
}
