import React, { useEffect, useRef } from 'react'
import { ZetaMode } from '../../hooks/useZetaCore'

interface Props {
  mode: ZetaMode
  volume: number
}

export function IronManFigure({ mode, volume }: Props): React.ReactElement {
  const arcRef = useRef<SVGCircleElement>(null)
  const eyeLeftRef = useRef<SVGEllipseElement>(null)
  const eyeRightRef = useRef<SVGEllipseElement>(null)

  const isActive = mode !== 'sleeping'
  const eyeColor = mode === 'listening' ? '#00ff88' : mode === 'speaking' ? '#00e5cc' : '#00e5cc'
  const arcColor = mode === 'listening' ? '#00ff88' : mode === 'thinking' ? '#ffcc00' : '#00e5cc'

  return (
    <div className="relative flex items-center justify-center" style={{ width: 320, height: 400 }}>
      {/* Arc reactor glow behind */}
      <div
        className="absolute rounded-full"
        style={{
          width: 80, height: 80,
          top: '55%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${arcColor}40 0%, transparent 70%)`,
          filter: 'blur(20px)',
          opacity: isActive ? 1 : 0.4,
          transition: 'all 0.5s ease',
          animation: isActive ? 'arc-pulse 1.5s ease-in-out infinite' : 'arc-pulse 3s ease-in-out infinite'
        }}
      />

      <svg
        viewBox="0 0 320 400"
        style={{ width: 320, height: 400, filter: `drop-shadow(0 0 2px ${eyeColor})` }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Helmet outline */}
        <g stroke="#00e5cc" strokeWidth="1.5" fill="none" opacity="0.9">
          {/* Head / helmet */}
          <path d="M 130 40 L 110 55 L 100 80 L 98 110 L 100 135 L 160 135 L 220 135 L 222 110 L 220 80 L 210 55 L 190 40 Z"
            strokeWidth="1.5" />
          {/* Face plate division */}
          <path d="M 130 60 L 120 75 L 118 100 L 160 100 L 202 100 L 200 75 L 190 60" strokeWidth="1" opacity="0.6"/>
          {/* Chin */}
          <path d="M 125 130 L 118 145 L 120 155 L 160 158 L 200 155 L 202 145 L 195 130" strokeWidth="1.2"/>
          {/* Helmet top ridge */}
          <path d="M 145 40 L 140 25 L 160 20 L 180 25 L 175 40" strokeWidth="1" opacity="0.7"/>
          {/* Ear pieces */}
          <rect x="97" y="90" width="8" height="20" rx="1" opacity="0.7"/>
          <rect x="215" y="90" width="8" height="20" rx="1" opacity="0.7"/>
        </g>

        {/* Eyes — glowing */}
        <g style={{ animation: 'eye-glow 2s ease-in-out infinite' }}>
          <ellipse ref={eyeLeftRef} cx="135" cy="95" rx="16" ry="8"
            fill={eyeColor} opacity={isActive ? "0.9" : "0.5"}
            style={{ transition: 'all 0.3s', filter: `drop-shadow(0 0 6px ${eyeColor})` }}/>
          <ellipse ref={eyeRightRef} cx="185" cy="95" rx="16" ry="8"
            fill={eyeColor} opacity={isActive ? "0.9" : "0.5"}
            style={{ transition: 'all 0.3s', filter: `drop-shadow(0 0 6px ${eyeColor})` }}/>
          {/* Eye inner */}
          <ellipse cx="135" cy="95" rx="8" ry="4" fill="white" opacity={isActive ? "0.4" : "0.15"}/>
          <ellipse cx="185" cy="95" rx="8" ry="4" fill="white" opacity={isActive ? "0.4" : "0.15"}/>
        </g>

        {/* Neck */}
        <g stroke="#00e5cc" strokeWidth="1.2" fill="none" opacity="0.8">
          <path d="M 145 155 L 142 170 L 178 170 L 175 155"/>
          <line x1="152" y1="158" x2="152" y2="170" opacity="0.5"/>
          <line x1="160" y1="158" x2="160" y2="170" opacity="0.5"/>
          <line x1="168" y1="158" x2="168" y2="170" opacity="0.5"/>
        </g>

        {/* Chest / torso */}
        <g stroke="#00e5cc" strokeWidth="1.5" fill="none">
          {/* Main chest plate */}
          <path d="M 100 170 L 88 185 L 82 210 L 80 240 L 85 270 L 160 275 L 235 270 L 240 240 L 238 210 L 232 185 L 220 170 L 145 170 Z"
            opacity="0.85"/>
          {/* Chest center line */}
          <line x1="160" y1="172" x2="160" y2="272" opacity="0.4"/>
          {/* Chest horizontal lines */}
          <path d="M 95 195 L 225 195" strokeWidth="1" opacity="0.4"/>
          <path d="M 90 220 L 230 220" strokeWidth="1" opacity="0.3"/>
          {/* Chest armor plates */}
          <path d="M 100 170 L 115 185 L 115 210 L 100 210" strokeWidth="1" opacity="0.6"/>
          <path d="M 220 170 L 205 185 L 205 210 L 220 210" strokeWidth="1" opacity="0.6"/>
          {/* Shoulder connectors */}
          <path d="M 100 170 L 78 160 L 68 175" strokeWidth="1.2" opacity="0.7"/>
          <path d="M 220 170 L 242 160 L 252 175" strokeWidth="1.2" opacity="0.7"/>
        </g>

        {/* Red accent lines on chest */}
        <g stroke="#ff2244" strokeWidth="1" fill="none" opacity="0.6">
          <path d="M 110 200 L 120 195 L 130 198 L 135 205"/>
          <path d="M 210 200 L 200 195 L 190 198 L 185 205"/>
          <circle cx="160" cy="162" r="3" fill="#ff2244" opacity="0.5"/>
          <circle cx="125" cy="180" r="2" fill="#ff2244" opacity="0.4"/>
          <circle cx="195" cy="180" r="2" fill="#ff2244" opacity="0.4"/>
        </g>

        {/* Arc Reactor */}
        <g>
          {/* Outer ring */}
          <circle cx="160" cy="222" r="28"
            stroke={arcColor} strokeWidth="1.5" fill="none"
            style={{ animation: 'rotate-ring 4s linear infinite' }}
            opacity="0.7"/>
          {/* Ring segments */}
          {[0,45,90,135,180,225,270,315].map((angle, i) => {
            const rad = (angle * Math.PI) / 180
            const x1 = 160 + 22 * Math.cos(rad)
            const y1 = 222 + 22 * Math.sin(rad)
            const x2 = 160 + 28 * Math.cos(rad)
            const y2 = 222 + 28 * Math.sin(rad)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={arcColor} strokeWidth="2" opacity="0.8"/>
          })}
          {/* Inner ring */}
          <circle cx="160" cy="222" r="18"
            stroke={arcColor} strokeWidth="1" fill="none"
            style={{ animation: 'rotate-ring-rev 3s linear infinite' }}
            opacity="0.9"/>
          {/* Arc glow core */}
          <circle ref={arcRef} cx="160" cy="222" r="12"
            fill={arcColor} opacity={isActive ? 0.85 : 0.4}
            style={{
              filter: `drop-shadow(0 0 8px ${arcColor}) drop-shadow(0 0 16px ${arcColor})`,
              transition: 'all 0.3s'
            }}/>
          <circle cx="160" cy="222" r="6" fill="white" opacity={isActive ? 0.6 : 0.2}/>
          {/* Inner hex */}
          <polygon points="160,212 167,216 167,224 160,228 153,224 153,216"
            stroke="white" strokeWidth="0.5" fill="none" opacity={isActive ? 0.5 : 0.2}/>
        </g>

        {/* Shoulders */}
        <g stroke="#00e5cc" strokeWidth="1.2" fill="none" opacity="0.8">
          {/* Left shoulder */}
          <path d="M 78 160 L 55 170 L 48 195 L 52 225 L 68 240 L 82 230 L 80 200 L 82 175"/>
          <path d="M 58 175 L 68 172 L 75 180" strokeWidth="1" opacity="0.6"/>
          {/* Right shoulder */}
          <path d="M 242 160 L 265 170 L 272 195 L 268 225 L 252 240 L 238 230 L 240 200 L 238 175"/>
          <path d="M 262 175 L 252 172 L 245 180" strokeWidth="1" opacity="0.6"/>
        </g>

        {/* HUD elements in background */}
        <g stroke="#00e5cc" strokeWidth="0.5" fill="none" opacity="0.2">
          <circle cx="160" cy="200" r="60"/>
          <circle cx="160" cy="200" r="80"/>
          {/* crosshair */}
          <line x1="160" y1="120" x2="160" y2="280"/>
          <line x1="80" y1="200" x2="240" y2="200"/>
        </g>

        {/* Volume waveform when listening */}
        {mode === 'listening' && (
          <g opacity="0.7">
            {[...Array(20)].map((_, i) => {
              const x = 65 + i * 10
              const h = 5 + Math.random() * 20 * (volume + 0.3)
              return (
                <rect key={i} x={x} y={380 - h} width="6" height={h}
                  fill="#00ff88" opacity="0.6" rx="1"/>
              )
            })}
          </g>
        )}
      </svg>

      {/* Mode label overlay */}
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: '9px',
          letterSpacing: '0.3em',
          color: eyeColor,
          opacity: 0.7,
          textShadow: `0 0 8px ${eyeColor}`
        }}>
          {mode === 'sleeping' && 'STANDBY · AWAITING COMMAND'}
          {mode === 'listening' && '● NEURAL LINK ACTIVE'}
          {mode === 'thinking' && '◎ PROCESSING COMMAND'}
          {mode === 'speaking' && '▶ TRANSMITTING RESPONSE'}
          {mode === 'error' && '✕ SYSTEM ERROR'}
        </span>
      </div>
    </div>
  )
}
