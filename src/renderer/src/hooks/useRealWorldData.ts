import { useState, useEffect, useCallback } from 'react'

export interface WeatherData {
  city: string
  country: string
  temp: number
  feelsLike: number
  description: string
  humidity: number
  windSpeed: number
  icon: string
  forecast?: Array<{
    date: string
    high: number
    low: number
    description: string
    icon: string
  }>
}

export interface NewsArticle {
  title: string
  description: string
  url: string
  source: string
  publishedAt: string
}

export interface Reminder {
  id: string
  text: string
  datetime: string
  completed: boolean
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  time?: string
  description?: string
}

// ── Weather Hook ─────────────────────────────────────────────────────────────
export function useWeather(refreshInterval = 300_000) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const res = await window.zeta.weather.current()
      if (res.success && res.data) {
        setWeather(res.data as WeatherData)
        setError(null)
      } else {
        setError(res.error || 'Failed to load weather')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, refreshInterval)
    return () => clearInterval(interval)
  }, [fetch, refreshInterval])

  return { weather, loading, error, refresh: fetch }
}

// ── News Hook ────────────────────────────────────────────────────────────────
export function useNews(refreshInterval = 600_000) {
  const [news, setNews] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const res = await window.zeta.news.headlines()
      if (res.success && res.data) {
        setNews(res.data as NewsArticle[])
        setError(null)
      } else {
        setError(res.error || 'Failed to load news')
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, refreshInterval)
    return () => clearInterval(interval)
  }, [fetch, refreshInterval])

  return { news, loading, error, refresh: fetch }
}

// ── Reminders Hook ───────────────────────────────────────────────────────────
export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const [remRes, evRes] = await Promise.all([
        window.zeta.reminder.upcoming(),
        window.zeta.calendar.today()
      ])
      if (remRes.success) setReminders((remRes.data as Reminder[]) || [])
      if (evRes.success) setEvents((evRes.data as CalendarEvent[]) || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 60_000)
    return () => clearInterval(interval)
  }, [refresh])

  const complete = useCallback(async (id: string) => {
    await window.zeta.reminder.complete(id)
    refresh()
  }, [refresh])

  const addReminder = useCallback(async (text: string, datetime: string) => {
    await window.zeta.reminder.add(text, datetime)
    refresh()
  }, [refresh])

  return { reminders, events, loading, refresh, complete, addReminder }
}
