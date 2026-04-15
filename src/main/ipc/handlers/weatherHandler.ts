import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface WeatherData {
  city: string
  country: string
  temp: number
  feelsLike: number
  description: string
  humidity: number
  windSpeed: number
  icon: string
  forecast?: ForecastDay[]
}

export interface ForecastDay {
  date: string
  high: number
  low: number
  description: string
  icon: string
}

// Detect user city from IP (no API key needed)
async function detectCity(): Promise<string> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) })
    const data = (await res.json()) as { city?: string; country_name?: string }
    return data.city || 'Rawalpindi'
  } catch {
    return 'Rawalpindi'
  }
}

// OpenWeatherMap free tier (no key = wttr.in fallback)
async function getWeatherFromWttr(city: string): Promise<WeatherData> {
  const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  const data = await res.json() as {
    current_condition: Array<{
      temp_C: string
      FeelsLikeC: string
      weatherDesc: Array<{ value: string }>
      humidity: string
      windspeedKmph: string
      weatherCode: string
    }>
    nearest_area: Array<{
      areaName: Array<{ value: string }>
      country: Array<{ value: string }>
    }>
    weather: Array<{
      date: string
      maxtempC: string
      mintempC: string
      hourly: Array<{
        weatherDesc: Array<{ value: string }>
        weatherCode: string
      }>
    }>
  }

  const cur = data.current_condition[0]
  const area = data.nearest_area[0]

  const iconMap: Record<string, string> = {
    '113': '☀️', '116': '⛅', '119': '☁️', '122': '☁️',
    '143': '🌫️', '176': '🌦️', '179': '🌨️', '182': '🌧️',
    '185': '🌧️', '200': '⛈️', '227': '❄️', '230': '❄️',
    '248': '🌫️', '260': '🌫️', '263': '🌦️', '266': '🌧️',
    '281': '🌧️', '284': '🌧️', '293': '🌦️', '296': '🌧️',
    '299': '🌧️', '302': '🌧️', '305': '🌧️', '308': '🌧️',
    '311': '🌧️', '314': '🌧️', '317': '🌨️', '320': '🌨️',
    '323': '🌨️', '326': '🌨️', '329': '❄️', '332': '❄️',
    '335': '❄️', '338': '❄️', '350': '🌨️', '353': '🌦️',
    '356': '🌧️', '359': '🌧️', '362': '🌨️', '365': '🌨️',
    '368': '🌨️', '371': '❄️', '374': '🌨️', '377': '🌨️',
    '386': '⛈️', '389': '⛈️', '392': '⛈️', '395': '❄️'
  }

  const forecast: ForecastDay[] = data.weather.slice(0, 3).map((day) => ({
    date: day.date,
    high: parseInt(day.maxtempC),
    low: parseInt(day.mintempC),
    description: day.hourly[4]?.weatherDesc[0]?.value || 'Unknown',
    icon: iconMap[day.hourly[4]?.weatherCode || '113'] || '🌡️'
  }))

  return {
    city: area.areaName[0]?.value || city,
    country: area.country[0]?.value || '',
    temp: parseInt(cur.temp_C),
    feelsLike: parseInt(cur.FeelsLikeC),
    description: cur.weatherDesc[0]?.value || 'Unknown',
    humidity: parseInt(cur.humidity),
    windSpeed: parseInt(cur.windspeedKmph),
    icon: iconMap[cur.weatherCode] || '🌡️',
    forecast
  }
}

async function getWeatherWithApiKey(city: string, apiKey: string): Promise<WeatherData> {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&cnt=9`

  const [weatherRes, forecastRes] = await Promise.all([
    fetch(url, { signal: AbortSignal.timeout(8000) }),
    fetch(forecastUrl, { signal: AbortSignal.timeout(8000) })
  ])

  const w = await weatherRes.json() as {
    name: string
    sys: { country: string }
    main: { temp: number; feels_like: number; humidity: number }
    weather: Array<{ description: string; icon: string }>
    wind: { speed: number }
  }
  const f = await forecastRes.json() as {
    list: Array<{
      dt_txt: string
      main: { temp_max: number; temp_min: number }
      weather: Array<{ description: string; icon: string }>
    }>
  }

  const emojiMap: Record<string, string> = {
    '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '⛅',
    '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌦️',
    '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️', '50d': '🌫️', '50n': '🌫️'
  }

  const forecast: ForecastDay[] = f.list
    .filter((_, i) => i % 3 === 0)
    .slice(0, 3)
    .map((item) => ({
      date: item.dt_txt.split(' ')[0],
      high: Math.round(item.main.temp_max),
      low: Math.round(item.main.temp_min),
      description: item.weather[0]?.description || '',
      icon: emojiMap[item.weather[0]?.icon || '01d'] || '🌡️'
    }))

  return {
    city: w.name,
    country: w.sys.country,
    temp: Math.round(w.main.temp),
    feelsLike: Math.round(w.main.feels_like),
    description: w.weather[0]?.description || '',
    humidity: w.main.humidity,
    windSpeed: Math.round(w.wind.speed * 3.6), // m/s → km/h
    icon: emojiMap[w.weather[0]?.icon || '01d'] || '🌡️',
    forecast
  }
}

export async function handleWeather(action: 'current' | 'forecast', payload: { city?: string }): Promise<{
  success: boolean
  data?: WeatherData
  error?: string
}> {
  try {
    let city = payload.city
    if (!city) city = await detectCity()

    const apiKey = process.env.OPENWEATHER_API_KEY
    let data: WeatherData

    if (apiKey && apiKey !== 'your_openweather_api_key_here') {
      data = await getWeatherWithApiKey(city, apiKey)
    } else {
      data = await getWeatherFromWttr(city)
    }

    return { success: true, data }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[Weather] Error:', errMsg)
    return { success: false, error: errMsg }
  }
}

// Format weather as natural language for AI responses
export function formatWeatherForAI(data: WeatherData): string {
  return `${data.icon} ${data.city}, ${data.country}: ${data.temp}°C (feels like ${data.feelsLike}°C), ${data.description}. Humidity: ${data.humidity}%, Wind: ${data.windSpeed} km/h`
}
