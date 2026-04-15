export interface NewsArticle {
  title: string
  description: string
  url: string
  source: string
  publishedAt: string
  category?: string
}

type NewsCategory = 'general' | 'technology' | 'business' | 'sports' | 'science' | 'health' | 'entertainment'

// Fetch news from GNews API (free tier: 100 req/day) or RSS fallback
async function fetchFromGNews(query?: string, category?: NewsCategory, apiKey?: string): Promise<NewsArticle[]> {
  const key = apiKey || process.env.GNEWS_API_KEY
  if (!key || key === 'your_gnews_api_key_here') {
    throw new Error('No GNews API key')
  }

  const params = new URLSearchParams({
    apikey: key,
    lang: 'en',
    max: '8'
  })

  let url: string
  if (query) {
    params.set('q', query)
    url = `https://gnews.io/api/v4/search?${params}`
  } else {
    if (category && category !== 'general') params.set('topic', category)
    url = `https://gnews.io/api/v4/top-headlines?${params}`
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  const data = await res.json() as {
    articles: Array<{
      title: string
      description: string
      url: string
      source: { name: string }
      publishedAt: string
    }>
  }

  return (data.articles || []).map((a) => ({
    title: a.title,
    description: a.description || '',
    url: a.url,
    source: a.source?.name || 'Unknown',
    publishedAt: a.publishedAt,
    category
  }))
}

// RSS fallback - no API key needed
async function fetchFromRSS(category: NewsCategory = 'general'): Promise<NewsArticle[]> {
  const feeds: Record<NewsCategory, string> = {
    general: 'https://feeds.bbci.co.uk/news/rss.xml',
    technology: 'https://feeds.feedburner.com/TechCrunch',
    business: 'https://feeds.bbci.co.uk/news/business/rss.xml',
    sports: 'https://feeds.bbci.co.uk/sport/rss.xml',
    science: 'https://www.sciencenews.org/feed',
    health: 'https://feeds.bbci.co.uk/news/health/rss.xml',
    entertainment: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml'
  }

  const feedUrl = feeds[category] || feeds.general
  const res = await fetch(feedUrl, { signal: AbortSignal.timeout(8000) })
  const xml = await res.text()

  // Simple RSS parser (no external lib needed)
  const articles: NewsArticle[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null && articles.length < 8) {
    const item = match[1]
    const title = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(item) || /<title>(.*?)<\/title>/.exec(item))?.[1]?.trim()
    const desc = (/<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(item) || /<description>(.*?)<\/description>/.exec(item))?.[1]?.trim()
    const link = /<link>(.*?)<\/link>/.exec(item)?.[1]?.trim()
    const pubDate = /<pubDate>(.*?)<\/pubDate>/.exec(item)?.[1]?.trim()

    if (title && link) {
      articles.push({
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
        description: (desc || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').slice(0, 200),
        url: link,
        source: 'BBC News',
        publishedAt: pubDate || new Date().toISOString(),
        category
      })
    }
  }

  return articles
}

export async function handleNews(
  action: 'headlines' | 'search',
  payload: { query?: string; category?: NewsCategory }
): Promise<{ success: boolean; data?: NewsArticle[]; error?: string }> {
  try {
    let articles: NewsArticle[] = []

    try {
      // Try GNews API first
      articles = await fetchFromGNews(payload.query, payload.category)
    } catch {
      // Fallback to RSS
      articles = await fetchFromRSS(payload.category || 'general')
    }

    return { success: true, data: articles }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[News] Error:', errMsg)
    return { success: false, error: errMsg }
  }
}

export function formatNewsForAI(articles: NewsArticle[]): string {
  return articles
    .slice(0, 5)
    .map((a, i) => `${i + 1}. ${a.title} (${a.source})`)
    .join('\n')
}
