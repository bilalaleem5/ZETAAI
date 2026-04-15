import React, { useState } from 'react'
import { useWeather, useNews, useReminders } from '../../hooks/useRealWorldData'

/* ══════════════════════════════════════════════════════════════
   WEATHER WIDGET
══════════════════════════════════════════════════════════════ */
export function WeatherWidget(): React.ReactElement {
  const { weather, loading, error, refresh } = useWeather()

  if (loading) {
    return (
      <div className="panel h-full p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#00e5cc] animate-pulse" />
          <span className="panel-title">Weather Intel</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span style={{ fontSize: 9, color: 'rgba(0,229,204,0.4)', fontFamily: 'Share Tech Mono, monospace' }}>
            CONNECTING TO SATELLITE...
          </span>
        </div>
      </div>
    )
  }

  if (error || !weather) {
    return (
      <div className="panel h-full p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#ff2244]" />
          <span className="panel-title">Weather Intel</span>
          <button onClick={refresh} style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(0,229,204,0.5)', cursor: 'pointer', background: 'none', border: 'none' }}>↻ RETRY</button>
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,34,68,0.7)', fontFamily: 'Share Tech Mono, monospace' }}>
          SIGNAL LOST — CHECK NETWORK
        </div>
      </div>
    )
  }

  return (
    <div className="panel h-full p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#00e5cc] animate-pulse-cyan" />
        <span className="panel-title">Weather Intel</span>
        <button onClick={refresh} style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(0,229,204,0.4)', cursor: 'pointer', background: 'none', border: 'none' }}>↻</button>
      </div>

      {/* Main temp display */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 28, lineHeight: 1 }}>{weather.icon}</span>
        <div>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: '#00e5cc', textShadow: '0 0 10px #00e5cc', lineHeight: 1 }}>
            {weather.temp}°C
          </div>
          <div style={{ fontSize: 9, color: 'rgba(0,229,204,0.5)', fontFamily: 'Share Tech Mono, monospace', textTransform: 'uppercase' }}>
            {weather.city}, {weather.country}
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{ fontSize: 9, color: 'rgba(0,229,204,0.7)', fontFamily: 'Share Tech Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {weather.description}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1" style={{ marginTop: 2 }}>
        {[
          { label: 'FEELS', value: `${weather.feelsLike}°` },
          { label: 'HUMID', value: `${weather.humidity}%` },
          { label: 'WIND', value: `${weather.windSpeed}km` }
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'rgba(0,229,204,0.04)', border: '1px solid rgba(0,229,204,0.1)', borderRadius: 4, padding: '3px 4px', textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: 'rgba(0,229,204,0.4)', fontFamily: 'Share Tech Mono, monospace' }}>{label}</div>
            <div style={{ fontSize: 10, color: '#00e5cc', fontFamily: 'Orbitron, monospace', fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* 3-day forecast */}
      {weather.forecast && weather.forecast.length > 0 && (
        <div className="flex gap-1 mt-1">
          {weather.forecast.slice(0, 3).map((day, i) => (
            <div key={i} style={{ flex: 1, background: 'rgba(0,229,204,0.03)', border: '1px solid rgba(0,229,204,0.08)', borderRadius: 4, padding: '3px 2px', textAlign: 'center' }}>
              <div style={{ fontSize: 7, color: 'rgba(0,229,204,0.4)', fontFamily: 'Share Tech Mono, monospace' }}>
                {i === 0 ? 'TODAY' : i === 1 ? 'TMRW' : day.date.slice(5)}
              </div>
              <div style={{ fontSize: 12 }}>{day.icon}</div>
              <div style={{ fontSize: 8, color: '#00e5cc', fontFamily: 'Orbitron, monospace' }}>
                {day.high}°/{day.low}°
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   NEWS FEED WIDGET
══════════════════════════════════════════════════════════════ */
export function NewsFeedWidget(): React.ReactElement {
  const { news, loading, error, refresh } = useNews()
  const [currentIndex, setCurrentIndex] = useState(0)

  const current = news[currentIndex]

  const next = () => setCurrentIndex((i) => (i + 1) % Math.max(news.length, 1))
  const prev = () => setCurrentIndex((i) => (i - 1 + Math.max(news.length, 1)) % Math.max(news.length, 1))

  if (loading) {
    return (
      <div className="panel h-full p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#00e5cc] animate-pulse" />
          <span className="panel-title">News Feed</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span style={{ fontSize: 9, color: 'rgba(0,229,204,0.4)', fontFamily: 'Share Tech Mono, monospace' }}>
            INTERCEPTING BROADCAST...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="panel h-full p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#00e5cc] animate-pulse-cyan" />
        <span className="panel-title">News Feed</span>
        <span style={{ marginLeft: 'auto', fontSize: 8, color: 'rgba(0,229,204,0.4)', fontFamily: 'Share Tech Mono, monospace' }}>
          {news.length > 0 ? `${currentIndex + 1}/${news.length}` : '—'}
        </span>
        <button onClick={refresh} style={{ fontSize: 9, color: 'rgba(0,229,204,0.4)', cursor: 'pointer', background: 'none', border: 'none', marginLeft: 4 }}>↻</button>
      </div>

      {!current || error ? (
        <div style={{ fontSize: 9, color: 'rgba(0,229,204,0.4)', fontFamily: 'Share Tech Mono, monospace' }}>
          {error || 'NO SIGNAL — CHECK NETWORK'}
        </div>
      ) : (
        <>
          {/* Source tag */}
          <div style={{ display: 'inline-block', background: 'rgba(0,229,204,0.08)', border: '1px solid rgba(0,229,204,0.2)', borderRadius: 3, padding: '1px 6px', fontSize: 8, color: '#00e5cc', fontFamily: 'Orbitron, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', alignSelf: 'flex-start' }}>
            {current.source}
          </div>

          {/* Headline */}
          <div style={{ fontSize: 10, color: 'rgba(0,229,204,0.9)', fontFamily: 'Share Tech Mono, monospace', lineHeight: 1.5, flex: 1, overflow: 'hidden' }}>
            {current.title.slice(0, 120)}{current.title.length > 120 ? '…' : ''}
          </div>

          {/* Description */}
          {current.description && (
            <div style={{ fontSize: 9, color: 'rgba(0,229,204,0.45)', fontFamily: 'Share Tech Mono, monospace', lineHeight: 1.4, overflow: 'hidden' }}>
              {current.description.slice(0, 100)}…
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-2 mt-1">
            <button onClick={prev} style={{ background: 'rgba(0,229,204,0.06)', border: '1px solid rgba(0,229,204,0.15)', borderRadius: 3, padding: '2px 8px', fontSize: 10, color: '#00e5cc', cursor: 'pointer' }}>◀</button>
            <div className="flex gap-1 flex-1 justify-center">
              {news.slice(0, 6).map((_, i) => (
                <div key={i} onClick={() => setCurrentIndex(i)} style={{ width: 6, height: 6, borderRadius: '50%', background: i === currentIndex ? '#00e5cc' : 'rgba(0,229,204,0.2)', cursor: 'pointer', boxShadow: i === currentIndex ? '0 0 4px #00e5cc' : 'none' }} />
              ))}
            </div>
            <button onClick={next} style={{ background: 'rgba(0,229,204,0.06)', border: '1px solid rgba(0,229,204,0.15)', borderRadius: 3, padding: '2px 8px', fontSize: 10, color: '#00e5cc', cursor: 'pointer' }}>▶</button>
          </div>
        </>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   REMINDERS & SCHEDULE WIDGET
══════════════════════════════════════════════════════════════ */
export function ScheduleWidget(): React.ReactElement {
  const { reminders, events, loading, complete, addReminder } = useReminders()
  const [showAdd, setShowAdd] = useState(false)
  const [newText, setNewText] = useState('')
  const [newTime, setNewTime] = useState('')

  const handleAdd = async () => {
    if (!newText.trim()) return
    const dt = newTime
      ? new Date(newTime).toISOString()
      : new Date(Date.now() + 3600_000).toISOString()
    await addReminder(newText.trim(), dt)
    setNewText('')
    setNewTime('')
    setShowAdd(false)
  }

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    } catch {
      return iso
    }
  }

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      if (d.toDateString() === today.toDateString()) return 'TODAY'
      if (d.toDateString() === tomorrow.toDateString()) return 'TOMORROW'
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
    } catch { return iso }
  }

  return (
    <div className="panel h-full p-3 flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#00e5cc] animate-pulse-cyan" />
        <span className="panel-title">Schedule</span>
        <button
          onClick={() => setShowAdd(s => !s)}
          style={{ marginLeft: 'auto', background: 'rgba(0,229,204,0.08)', border: '1px solid rgba(0,229,204,0.2)', borderRadius: 3, padding: '1px 6px', fontSize: 10, color: '#00e5cc', cursor: 'pointer' }}
        >
          {showAdd ? '✕' : '+ ADD'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ background: 'rgba(0,229,204,0.04)', border: '1px solid rgba(0,229,204,0.15)', borderRadius: 4, padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="Reminder text..."
            style={{ background: 'rgba(0,229,204,0.04)', border: '1px solid rgba(0,229,204,0.15)', borderRadius: 3, padding: '3px 6px', fontSize: 9, color: 'rgba(0,229,204,0.9)', fontFamily: 'Share Tech Mono, monospace', outline: 'none', width: '100%' }}
          />
          <input
            type="datetime-local"
            value={newTime}
            onChange={e => setNewTime(e.target.value)}
            style={{ background: 'rgba(0,229,204,0.04)', border: '1px solid rgba(0,229,204,0.15)', borderRadius: 3, padding: '3px 6px', fontSize: 9, color: 'rgba(0,229,204,0.9)', fontFamily: 'Share Tech Mono, monospace', outline: 'none', width: '100%', colorScheme: 'dark' }}
          />
          <button
            onClick={handleAdd}
            style={{ background: 'rgba(0,229,204,0.12)', border: '1px solid rgba(0,229,204,0.3)', borderRadius: 3, padding: '3px', fontSize: 9, color: '#00e5cc', cursor: 'pointer', fontFamily: 'Orbitron, monospace' }}
          >
            CONFIRM
          </button>
        </div>
      )}

      {loading ? (
        <span style={{ fontSize: 9, color: 'rgba(0,229,204,0.4)', fontFamily: 'Share Tech Mono, monospace' }}>LOADING...</span>
      ) : (
        <div className="flex flex-col gap-1 overflow-y-auto flex-1" style={{ scrollbarWidth: 'none' }}>
          {/* Today's events */}
          {events.length > 0 && (
            <>
              <div style={{ fontSize: 8, color: 'rgba(0,229,204,0.35)', fontFamily: 'Orbitron, monospace', letterSpacing: '0.1em', marginTop: 2 }}>TODAY'S EVENTS</div>
              {events.map(ev => (
                <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,229,204,0.04)', border: '1px solid rgba(0,229,204,0.1)', borderRadius: 4, padding: '4px 6px' }}>
                  <span style={{ fontSize: 9, color: '#00e5cc', minWidth: 36, fontFamily: 'Orbitron, monospace' }}>{ev.time || '—'}</span>
                  <span style={{ fontSize: 9, color: 'rgba(0,229,204,0.8)', fontFamily: 'Share Tech Mono, monospace', flex: 1 }}>{ev.title}</span>
                </div>
              ))}
            </>
          )}

          {/* Reminders */}
          {reminders.length > 0 && (
            <>
              <div style={{ fontSize: 8, color: 'rgba(0,229,204,0.35)', fontFamily: 'Orbitron, monospace', letterSpacing: '0.1em', marginTop: 4 }}>REMINDERS</div>
              {reminders.slice(0, 5).map(rem => (
                <div key={rem.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,229,204,0.03)', border: '1px solid rgba(0,229,204,0.08)', borderRadius: 4, padding: '4px 6px' }}>
                  <button
                    onClick={() => complete(rem.id)}
                    style={{ width: 12, height: 12, borderRadius: '50%', border: '1px solid rgba(0,229,204,0.4)', background: 'none', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 9, color: 'rgba(0,229,204,0.85)', fontFamily: 'Share Tech Mono, monospace' }}>{rem.text}</div>
                    <div style={{ fontSize: 8, color: 'rgba(0,229,204,0.4)', fontFamily: 'Share Tech Mono, monospace' }}>
                      {formatDate(rem.datetime)} {formatTime(rem.datetime)}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {events.length === 0 && reminders.length === 0 && (
            <div style={{ fontSize: 9, color: 'rgba(0,229,204,0.3)', fontFamily: 'Share Tech Mono, monospace', textAlign: 'center', marginTop: 8 }}>
              NO EVENTS SCHEDULED<br />
              <span style={{ fontSize: 8 }}>SAY "SET REMINDER" TO ZETA</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
