import React, { useEffect, useRef, useState } from 'react'

/* ── System Stats (fake live data — real data needs Electron IPC) ── */
function useLiveStats() {
  const [stats, setStats] = useState({ cpu: 57, ram: 83, disk: 47, temp: 42, net: { up: 0.2, down: 0.6 } })
  const [history, setHistory] = useState<number[]>(Array(40).fill(40))

  useEffect(() => {
    const interval = setInterval(() => {
      const cpu = Math.max(10, Math.min(95, stats.cpu + (Math.random() - 0.5) * 8))
      setStats(s => ({
        cpu: Math.round(cpu),
        ram: Math.max(60, Math.min(95, s.ram + (Math.random() - 0.5) * 3)),
        disk: s.disk,
        temp: Math.max(35, Math.min(85, s.temp + (Math.random() - 0.5) * 2)),
        net: {
          up: Math.max(0, s.net.up + (Math.random() - 0.5) * 0.3),
          down: Math.max(0, s.net.down + (Math.random() - 0.5) * 0.5)
        }
      }))
      setHistory(h => [...h.slice(1), Math.round(cpu)])
    }, 1000)
    return () => clearInterval(interval)
  }, [stats.cpu])

  return { stats, history }
}

/* ── System Monitor Panel ── */
export function SystemMonitor(): React.ReactElement {
  const { stats, history } = useLiveStats()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)

    // Grid
    ctx.strokeStyle = 'rgba(0,229,204,0.08)'
    ctx.lineWidth = 1
    for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y < H; y += 15) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    // CPU line
    const step = W / (history.length - 1)
    ctx.beginPath()
    history.forEach((v, i) => {
      const x = i * step
      const y = H - (v / 100) * H
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.strokeStyle = '#00e5cc'
    ctx.lineWidth = 1.5
    ctx.shadowBlur = 6
    ctx.shadowColor = '#00e5cc'
    ctx.stroke()

    // Fill
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath()
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, 'rgba(0,229,204,0.15)')
    grad.addColorStop(1, 'rgba(0,229,204,0)')
    ctx.fillStyle = grad
    ctx.fill()
    ctx.shadowBlur = 0
  }, [history])

  return (
    <div className="panel h-full p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#00e5cc] animate-pulse-cyan" />
        <span className="panel-title">System Monitor</span>
        <span className="ml-auto text-[10px]" style={{ color: 'rgba(0,229,204,0.4)' }}>• • •</span>
      </div>
      <div className="text-[9px]" style={{ color: 'rgba(0,229,204,0.4)' }}>CPU LOAD HISTORY</div>
      <canvas ref={canvasRef} width={200} height={70} className="w-full" style={{ height: 70 }} />
      <div className="grid grid-cols-4 gap-2 mt-1">
        {[
          { label: 'CPU', value: `${stats.cpu}%`, warn: stats.cpu > 80 },
          { label: 'RAM', value: `${stats.ram}%`, warn: stats.ram > 85 },
          { label: 'DISK', value: `${stats.disk}%`, warn: false },
          { label: 'TEMP', value: `${stats.temp}°C`, warn: stats.temp > 70 }
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="text-[9px]" style={{ color: 'rgba(0,229,204,0.5)' }}>{s.label}</div>
            <div className={`text-[13px] font-bold ${s.warn ? 'glow-red' : 'glow'}`}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Network Traffic Panel ── */
export function NetworkTraffic(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const upHistRef = useRef<number[]>(Array(40).fill(0))
  const downHistRef = useRef<number[]>(Array(40).fill(0))
  const [net, setNet] = useState({ up: 0.2, down: 0.6 })

  useEffect(() => {
    const interval = setInterval(() => {
      const up = Math.max(0, net.up + (Math.random() - 0.4) * 0.5)
      const down = Math.max(0, net.down + (Math.random() - 0.4) * 0.8)
      upHistRef.current = [...upHistRef.current.slice(1), up]
      downHistRef.current = [...downHistRef.current.slice(1), down]
      setNet({ up, down })
    }, 800)
    return () => clearInterval(interval)
  }, [net])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)

    const drawLine = (data: number[], color: string, max: number) => {
      const step = W / (data.length - 1)
      ctx.beginPath()
      data.forEach((v, i) => {
        const x = i * step
        const y = H - (v / max) * H * 0.8
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.shadowBlur = 5
      ctx.shadowColor = color
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    const maxVal = Math.max(...upHistRef.current, ...downHistRef.current, 1)
    drawLine(upHistRef.current, '#00e5cc', maxVal)
    drawLine(downHistRef.current, '#ff2244', maxVal)
  }, [net])

  return (
    <div className="panel h-full p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#00e5cc] animate-pulse-cyan" />
        <span className="panel-title">Network Traffic</span>
      </div>
      <div className="flex gap-4 text-[9px]">
        <span style={{ color: '#00e5cc' }}>▲ UP</span>
        <span style={{ color: '#ff2244' }}>▼ DOWN</span>
      </div>
      <canvas ref={canvasRef} width={200} height={55} className="w-full" style={{ height: 55 }} />
      <div className="flex justify-between text-[10px] mt-1">
        <div><span style={{ color: 'rgba(0,229,204,0.5)' }}>▲ UPLOAD </span><span className="glow">{net.up.toFixed(1)} KB/s</span></div>
        <div><span style={{ color: 'rgba(255,34,68,0.7)' }}>▼ DOWNLOAD </span><span style={{ color: '#ff2244', textShadow: '0 0 6px #ff2244' }}>{net.down.toFixed(1)} KB/s</span></div>
      </div>
    </div>
  )
}

/* ── System Info Panel ── */
export function SystemInfo(): React.ReactElement {
  const [time, setTime] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(i) }, [])

  const info = [
    { label: 'HOST', value: 'BilalAleem' },
    { label: 'IP', value: '192.168.1.x' },
    { label: 'OS', value: 'Windows 11' },
    { label: 'UPTIME', value: `${Math.floor(time.getHours())}h ${time.getMinutes()}m` },
    { label: 'STATUS', value: '● ONLINE', online: true }
  ]

  return (
    <div className="panel h-full p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#00e5cc] animate-pulse-cyan" />
        <span className="panel-title">System Info</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {info.map(item => (
          <div key={item.label} className="flex gap-3 text-[10px]">
            <span style={{ color: 'rgba(0,229,204,0.45)', minWidth: 48 }}>{item.label}</span>
            <span className={item.online ? 'glow' : ''} style={{ color: item.online ? '#00ff88' : 'rgba(0,229,204,0.85)' }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Processor Cores ── */
export function ProcessorCores(): React.ReactElement {
  const [cores, setCores] = useState([61, 44, 51, 46, 43, 34, 37, 65])
  useEffect(() => {
    const i = setInterval(() => {
      setCores(c => c.map(v => Math.max(5, Math.min(99, v + (Math.random() - 0.5) * 10))))
    }, 1200)
    return () => clearInterval(i)
  }, [])

  return (
    <div className="panel h-full p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#00e5cc] animate-pulse-cyan" />
        <span className="panel-title">Processor Cores</span>
      </div>
      <div className="flex flex-col gap-2">
        {cores.map((val, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[9px] w-6" style={{ color: 'rgba(0,229,204,0.5)' }}>C0{i}</span>
            <div className="flex-1 progress-bar">
              <div className="progress-fill" style={{ width: `${val}%` }} />
            </div>
            <span className="text-[10px] w-6 text-right glow">{Math.round(val)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Tactical Radar ── */
export function TacticalRadar(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const angleRef = useRef(0)
  const dotsRef = useRef([
    { x: 0.3, y: 0.4, color: '#ff2244' },
    { x: 0.7, y: 0.6, color: '#00e5cc' },
    { x: 0.5, y: 0.75, color: '#00e5cc' },
    { x: 0.2, y: 0.65, color: '#ff2244' }
  ])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 4

    let animId: number
    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // Background
      ctx.fillStyle = 'rgba(0,10,10,0.8)'
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()

      // Grid rings
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath(); ctx.arc(cx, cy, r * i / 4, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(0,229,204,0.15)'; ctx.lineWidth = 1; ctx.stroke()
      }
      // Grid lines
      for (let a = 0; a < 4; a++) {
        const angle = (a / 4) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
        ctx.lineTo(cx - Math.cos(angle) * r, cy - Math.sin(angle) * r)
        ctx.strokeStyle = 'rgba(0,229,204,0.12)'; ctx.stroke()
      }

      // Sweep
      angleRef.current = (angleRef.current + 0.02) % (Math.PI * 2)
      const sweepGrad = ctx.createConicalGradient
        ? null
        : null
      // Manual sweep cone
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(angleRef.current)
      const coneGrad = ctx.createLinearGradient(0, 0, r, 0)
      coneGrad.addColorStop(0, 'rgba(0,229,204,0.5)')
      coneGrad.addColorStop(1, 'rgba(0,229,204,0)')
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, r, -0.4, 0)
      ctx.fillStyle = coneGrad
      ctx.fill()
      ctx.restore()

      // Sweep line
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(angleRef.current) * r, cy + Math.sin(angleRef.current) * r)
      ctx.strokeStyle = 'rgba(0,229,204,0.8)'; ctx.lineWidth = 1.5
      ctx.shadowBlur = 6; ctx.shadowColor = '#00e5cc'
      ctx.stroke(); ctx.shadowBlur = 0

      // Center dot
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#00e5cc'
      ctx.shadowBlur = 8; ctx.shadowColor = '#00e5cc'
      ctx.fill(); ctx.shadowBlur = 0

      // Blips
      dotsRef.current.forEach(dot => {
        const x = dot.x * W
        const y = dot.y * H
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fillStyle = dot.color
        ctx.shadowBlur = 8; ctx.shadowColor = dot.color
        ctx.fill(); ctx.shadowBlur = 0
      })

      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div className="panel h-full p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-[#00e5cc] animate-pulse-cyan" />
        <span className="panel-title">Tactical Radar</span>
      </div>
      <div className="flex gap-3 items-center">
        <div>
          <div className="text-[8px] mb-1" style={{ color: 'rgba(0,229,204,0.4)' }}>RANGE: 500m</div>
          <div className="flex flex-col gap-1 text-[9px]">
            <span style={{ color: '#ff2244' }}>● UNKNOWN</span>
            <span style={{ color: '#00e5cc' }}>● FRIENDLY</span>
          </div>
        </div>
        <canvas ref={canvasRef} width={110} height={110} className="flex-1"
          style={{ width: 110, height: 110, borderRadius: '50%' }} />
      </div>
      <div className="text-[9px] mt-1" style={{ color: 'rgba(0,229,204,0.5)' }}>
        THREAT: <span style={{ color: '#00ff88' }}>NONE</span>
        &nbsp;&nbsp;RANGE: 500m
      </div>
    </div>
  )
}
