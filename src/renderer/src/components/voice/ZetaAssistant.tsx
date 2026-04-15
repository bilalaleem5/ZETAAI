import React, { useState, useEffect } from 'react'
import { IronManFigure } from './IronManFigure'
import { CommandTerminal } from './CommandTerminal'
import { SystemMonitor, NetworkTraffic, ProcessorCores, TacticalRadar } from './SystemWidgets'
import { WeatherWidget, NewsFeedWidget, ScheduleWidget } from '../widgets/LiveWidgets'
import { useZetaCore } from '../../hooks/useZetaCore'

function Clock(): React.ReactElement {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i) }, [])
  const pad = (n: number) => String(n).padStart(2, '0')
  const days = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY']
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  return (
    <div className="flex items-center gap-4">
      <span style={{ fontFamily:'Orbitron,monospace', fontSize:26, fontWeight:900, color:'#00e5cc', textShadow:'0 0 15px #00e5cc,0 0 30px #00e5cc40' }}>
        {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
      </span>
      <div style={{ fontFamily:'Share Tech Mono,monospace', fontSize:10, color:'rgba(0,229,204,0.5)', lineHeight:1.6 }}>
        <div>{days[now.getDay()]}</div>
        <div>{now.getDate()} {months[now.getMonth()]} {now.getFullYear()}</div>
      </div>
    </div>
  )
}

// Left panel tab switcher: System stats OR live intel
type LeftTab = 'system' | 'intel'
// Right panel tab switcher: Cores OR schedule
type RightTab = 'cores' | 'schedule'

export function ZetaAssistant(): React.ReactElement {
  const { mode, streamingText, lastResponse, voice, manualWake, stopAll, isWatching } = useZetaCore()
  const [leftTab, setLeftTab] = useState<LeftTab>('system')
  const [rightTab, setRightTab] = useState<RightTab>('cores')

  const handleManualSend = (text: string) => {
    window.dispatchEvent(new CustomEvent('zeta:direct-command', { detail: { text } }))
  }

  const modeColor = { sleeping:'#00e5cc', listening:'#00ff88', thinking:'#ffcc00', speaking:'#00e5cc', error:'#ff2244' }[mode]
  const modeLabel = { sleeping:'STANDBY', listening:'● LISTENING', thinking:'◎ PROCESSING', speaking:'▶ SPEAKING', error:'✕ ERROR' }[mode]

  const tabStyle = (active: boolean) => ({
    fontFamily: 'Orbitron, monospace',
    fontSize: 7,
    letterSpacing: '0.1em',
    padding: '2px 6px',
    border: `1px solid ${active ? 'rgba(0,229,204,0.4)' : 'rgba(0,229,204,0.1)'}`,
    background: active ? 'rgba(0,229,204,0.08)' : 'transparent',
    color: active ? '#00e5cc' : 'rgba(0,229,204,0.35)',
    cursor: 'pointer',
    textShadow: active ? '0 0 6px #00e5cc' : 'none',
    transition: 'all 0.2s',
    borderRadius: 2
  })

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background:'#000d0d', fontFamily:'Share Tech Mono,monospace' }}>

      {/* TOP HEADER */}
      <div className="flex items-center px-4 h-9 flex-shrink-0 border-b" style={{ borderColor:'rgba(0,229,204,0.2)', background:'rgba(0,8,8,0.95)' }}>
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" stroke="#00e5cc" strokeWidth="1.5" fill="none"/><circle cx="9" cy="9" r="4" fill="#00e5cc" opacity="0.7"/></svg>
          <span style={{ fontFamily:'Orbitron,monospace', fontSize:13, fontWeight:700, color:'#00e5cc', textShadow:'0 0 10px #00e5cc', letterSpacing:'0.1em' }}>ZETA AI</span>
        </div>
        <div className="flex-1 text-center" style={{ fontFamily:'Orbitron,monospace', fontSize:10, color:'#00e5cc', letterSpacing:'0.25em' }}>
          ♦&nbsp;&nbsp;NEURAL CORE: 99.8%&nbsp;&nbsp;·&nbsp;&nbsp;ALL SYSTEMS NOMINAL&nbsp;&nbsp;♦
        </div>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:10, color:'rgba(0,229,204,0.5)', letterSpacing:'0.15em' }}>
          v2.0&nbsp;&nbsp;<span style={{ color:'#00ff88' }}>ONLINE →</span>
        </div>
      </div>

      {/* MAIN 3-COLUMN GRID */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL */}
        <div style={{ width:220, flexShrink:0, borderRight:'1px solid rgba(0,229,204,0.12)', display:'flex', flexDirection:'column' }}>
          {/* Left tab bar */}
          <div style={{ display:'flex', gap:3, padding:'4px 6px', borderBottom:'1px solid rgba(0,229,204,0.1)', background:'rgba(0,229,204,0.02)', flexShrink:0 }}>
            <button style={tabStyle(leftTab === 'system')} onClick={() => setLeftTab('system')}>SYS</button>
            <button style={tabStyle(leftTab === 'intel')} onClick={() => setLeftTab('intel')}>INTEL</button>
          </div>

          {leftTab === 'system' ? (
            <>
              <div style={{ flex:'0 0 42%', borderBottom:'1px solid rgba(0,229,204,0.1)' }}><SystemMonitor /></div>
              <div style={{ flex:'0 0 28%', borderBottom:'1px solid rgba(0,229,204,0.1)' }}><NetworkTraffic /></div>
              <div style={{ flex:1 }}><WeatherWidget /></div>
            </>
          ) : (
            <>
              <div style={{ flex:'0 0 55%', borderBottom:'1px solid rgba(0,229,204,0.1)' }}><NewsFeedWidget /></div>
              <div style={{ flex:1 }}><ScheduleWidget /></div>
            </>
          )}
        </div>

        {/* CENTER */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Status strip */}
          <div className="flex items-center justify-between px-4 py-1 flex-shrink-0 border-b" style={{ borderColor:'rgba(0,229,204,0.1)', background:'rgba(0,229,204,0.02)' }}>
            <div style={{ fontSize:9, fontFamily:'Orbitron,monospace', color:'rgba(0,229,204,0.35)', letterSpacing:'0.1em' }}>
              SYS: 97&nbsp;&nbsp;NET: 0&nbsp;&nbsp;ARC: 100
            </div>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:11, color:'#00e5cc', letterSpacing:'0.35em', textShadow:'0 0 8px #00e5cc' }}>
              ○ Z E T A A I · M A R K II ○
            </div>
            <div style={{ fontSize:9, fontFamily:'Orbitron,monospace', color:'rgba(0,229,204,0.35)', letterSpacing:'0.1em' }}>
              CPU: 57&nbsp;&nbsp;GPU: 34&nbsp;&nbsp;RAM: 83
            </div>
          </div>

          {/* Iron Man */}
          <div
            className="flex-1 flex items-center justify-center relative overflow-hidden cursor-pointer"
            style={{ background:'radial-gradient(ellipse at center, rgba(0,229,204,0.05) 0%, transparent 70%)' }}
            onClick={mode === 'sleeping' ? manualWake : stopAll}
          >
            <div className="absolute inset-0" style={{
              backgroundImage:'linear-gradient(rgba(0,229,204,0.04) 1px, transparent 1px),linear-gradient(90deg, rgba(0,229,204,0.04) 1px, transparent 1px)',
              backgroundSize:'30px 30px'
            }}/>
            <div className="scan-line"/>
            <IronManFigure mode={mode} volume={voice.volume} />
            {mode === 'sleeping' && (
              <div className="absolute bottom-4 left-0 right-0 text-center animate-pulse-cyan">
                <span style={{ fontSize:9, fontFamily:'Orbitron,monospace', color:'rgba(0,229,204,0.35)', letterSpacing:'0.2em' }}>
                  [ SAY "ZETA" · DOUBLE CLAP · CLICK ]
                </span>
              </div>
            )}
          </div>

          {/* Bottom strip */}
          <div className="flex items-center gap-6 px-4 py-1 border-t flex-shrink-0" style={{ borderColor:'rgba(0,229,204,0.1)', fontSize:9, fontFamily:'Orbitron,monospace', color:'rgba(0,229,204,0.3)' }}>
            <span>NEURAL CORE</span>
            <span>OUTPUT: 99.8%</span>
            <span style={{ color:modeColor, textShadow:`0 0 6px ${modeColor}` }}>{modeLabel}</span>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ width:230, flexShrink:0, borderLeft:'1px solid rgba(0,229,204,0.12)', display:'flex', flexDirection:'column' }}>
          {/* Right tab bar */}
          <div style={{ display:'flex', gap:3, padding:'4px 6px', borderBottom:'1px solid rgba(0,229,204,0.1)', background:'rgba(0,229,204,0.02)', flexShrink:0 }}>
            <button style={tabStyle(rightTab === 'cores')} onClick={() => setRightTab('cores')}>CPU</button>
            <button style={tabStyle(rightTab === 'schedule')} onClick={() => setRightTab('schedule')}>TASKS</button>
          </div>

          {rightTab === 'cores' ? (
            <>
              <div style={{ flex:'0 0 55%', borderBottom:'1px solid rgba(0,229,204,0.1)' }}><ProcessorCores /></div>
              <div style={{ flex:1 }}><TacticalRadar /></div>
            </>
          ) : (
            <div style={{ flex:1, overflow:'hidden' }}><ScheduleWidget /></div>
          )}
        </div>
      </div>

      {/* TERMINAL */}
      <div className="flex-shrink-0 border-t" style={{ height:200, borderColor:'rgba(0,229,204,0.2)' }}>
        <CommandTerminal
          mode={mode}
          transcript={voice.transcript}
          streamingText={streamingText}
          lastResponse={lastResponse}
          onManualSend={handleManualSend}
          isListening={mode === 'listening'}
        />
      </div>

      {/* STATUS BAR */}
      <div className="flex items-center px-4 h-9 flex-shrink-0 border-t" style={{ borderColor:'rgba(0,229,204,0.2)', background:'rgba(0,5,5,0.95)' }}>
        <Clock />
        <div style={{ flex:1 }}/>
        <div className="flex items-center gap-4" style={{ fontSize:9, fontFamily:'Orbitron,monospace', color:'rgba(0,229,204,0.4)' }}>
          <span>MODE</span><span style={{ color:modeColor }}>{mode.toUpperCase()}</span>
          <span>THREAT</span><span style={{ color:'#00ff88' }}>NONE</span>
          <span>NETWORK</span><span style={{ color:'#00ff88' }}>ONLINE</span>
          <span>AI</span><span style={{ color:'#00e5cc' }}>GROQ</span>
          <div className="flex items-center gap-1.5 ml-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isWatching ? 'bg-[#00ff88] animate-pulse' : 'bg-[#1e293b]'}`}/>
            <span style={{ color: isWatching ? '#00ff88' : 'rgba(0,229,204,0.25)' }}>{isWatching ? 'WAKE ACTIVE' : 'WAKE OFF'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
