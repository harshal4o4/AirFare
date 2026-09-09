// src/components/InterpretationBanner.jsx — Speedometer Gauge Hero Card (Zero Text Overlap)
import React, { useEffect, useState, useRef } from 'react'
import { TrendingUp, Info, Activity, ShieldCheck, Calendar, ArrowUpRight } from 'lucide-react'

// Hook for smooth synchronized counter animation
function useAnimatedCounter(target, duration = 2200, start = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) {
      setValue(0)
      return
    }
    let startTime = null
    let animationFrameId
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(eased * target)
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step)
      } else {
        setValue(target)
      }
    }
    animationFrameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationFrameId)
  }, [target, duration, start])
  return value
}

export default function InterpretationBanner({ indexValue = 127.4, pctChange = 4.2, yoyChange = 8.7 }) {
  const cardRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )
    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [])

  const animatedIndex = useAnimatedCounter(indexValue, 2400, isVisible)
  const diffFromBase = (animatedIndex - 100).toFixed(1)

  // Speedometer 240° Arc calculation
  // Radius = 100, Circumference of full circle = 2 * PI * 100 = 628.3
  // 240° Arc length = 628.3 * (240/360) = 418.8
  const maxScale = 200
  const clampedVal = Math.min(Math.max(animatedIndex, 0), maxScale)
  const pct = clampedVal / maxScale
  const arcLength = 418.8
  const strokeDashoffset = arcLength * (1 - pct)

  // Generate tick mark notches for the speedometer dial
  const ticks = []
  const totalTicks = 13
  for (let i = 0; i < totalTicks; i++) {
    const angleDeg = -210 + i * (240 / (totalTicks - 1))
    const angleRad = (angleDeg * Math.PI) / 180
    const innerR = 86
    const outerR = 96
    const x1 = 140 + innerR * Math.cos(angleRad)
    const y1 = 140 + innerR * Math.sin(angleRad)
    const x2 = 140 + outerR * Math.cos(angleRad)
    const y2 = 140 + outerR * Math.sin(angleRad)
    ticks.push({ x1, y1, x2, y2, i })
  }

  return (
    <div
      ref={cardRef}
      style={{
        background: '#07070a',
        borderRadius: 28,
        padding: '36px 40px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'relative',
        overflow: 'hidden',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        boxSizing: 'border-box',
      }}
    >
      {/* Ambient background glow */}
      <div style={{
        position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
        width: 380, height: 260,
        background: 'radial-gradient(ellipse, rgba(255, 60, 48, 0.18) 0%, rgba(255, 106, 26, 0.08) 45%, transparent 75%)',
        pointerEvents: 'none',
      }} />

      {/* Top Header Title Box */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16, width: '100%',
        paddingBottom: 20, borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: 'rgba(255,106,26,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,106,26,0.3)'
          }}>
            <Activity size={18} style={{ color: '#ff6a1a' }} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
              National Airfare Price Index (APIx)
            </p>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0' }}>
              Real-time weighted geometric index across 30 major domestic corridors
            </p>
          </div>
        </div>
        <span style={{
          padding: '6px 16px', borderRadius: 99,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em'
        }}>
          MoSPI / DGCA Standard
        </span>
      </div>

      {/* MAIN CENTERPIECE: PROMINENT SPEEDOMETER GAUGE */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '10px 0', position: 'relative'
      }}>
        <div style={{
          position: 'relative', width: 280, height: 210,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <svg width="280" height="210" viewBox="0 0 280 210" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="speedoTrackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ff9500" />
                <stop offset="50%" stopColor="#ff3b30" />
                <stop offset="100%" stopColor="#ff2d55" />
              </linearGradient>
              <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background Dial Ring */}
            <path
              d="M 53.4 190 A 100 100 0 1 1 226.6 190"
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="16"
              strokeLinecap="round"
            />

            {/* Tick Mark Notches */}
            {ticks.map((t) => (
              <line
                key={t.i}
                x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                stroke="rgba(255, 255, 255, 0.25)"
                strokeWidth={t.i % 3 === 0 ? 2.5 : 1.5}
              />
            ))}

            {/* Synchronized Growing Gradient Arc */}
            <path
              d="M 53.4 190 A 100 100 0 1 1 226.6 190"
              fill="none"
              stroke="url(#speedoTrackGrad)"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={arcLength}
              strokeDashoffset={strokeDashoffset}
              filter="url(#gaugeGlow)"
              style={{ transition: 'stroke-dashoffset 0.04s linear' }}
            />

            {/* Scale End Labels - Positions at exact Arc ends with zero overlap */}
            <text x="38" y="198" fill="rgba(255,255,255,0.6)" fontSize="12" fontWeight="700" textAnchor="middle">0</text>
            <text x="242" y="198" fill="rgba(255,255,255,0.6)" fontSize="12" fontWeight="700" textAnchor="middle">200</text>
          </svg>

          {/* Center Digital Display (Sits comfortably inside circle with zero overlap) */}
          <div style={{
            position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            width: '100%', pointerEvents: 'none'
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em', marginBottom: 2 }}>
              INDEX POINTS
            </span>
            <span style={{
              fontSize: 58, fontWeight: 900, color: '#ffffff',
              fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-0.03em',
              textShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>
              {animatedIndex.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Change Badge positioned cleanly below Speedometer */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 20px', borderRadius: 99,
          background: 'rgba(46,204,113,0.15)', border: '1px solid rgba(46,204,113,0.3)',
          marginTop: 16
        }}>
          <TrendingUp size={15} style={{ color: '#2ecc71' }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#2ecc71' }}>+{pctChange}% vs prev month</span>
        </div>
      </div>

      {/* Surrounding Connected Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Base Benchmark', val: '100.0', sub: '2024 Base Period', icon: ShieldCheck, color: '#3b82f6' },
          { label: 'YoY Growth Rate', val: `+${yoyChange}%`, sub: 'vs last year', icon: ArrowUpRight, color: '#2ecc71' },
          { label: 'Current Cycle', val: 'Sep 2026', sub: 'Daily Data Feed', icon: Calendar, color: '#ff6a1a' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '20px 24px', borderRadius: 20,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)' }}>
                {s.label}
              </span>
              <s.icon size={15} style={{ color: s.color }} />
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: s.color === '#2ecc71' ? '#2ecc71' : '#ffffff', fontVariantNumeric: 'tabular-nums', margin: '0 0 3px' }}>
              {s.val}
            </p>
            <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom Summary Note */}
      <div style={{
        padding: '16px 22px', borderRadius: 16,
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Info size={16} style={{ color: '#ff6a1a', flexShrink: 0 }} />
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, margin: 0 }}>
          <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>Market Summary:</span>{' '}
          Airfares are currently running{' '}
          <span style={{ fontWeight: 700, color: '#2ecc71' }}>{diffFromBase}% higher</span>{' '}
          than the base benchmark period across domestic flight corridors.
        </p>
      </div>
    </div>
  )
}
