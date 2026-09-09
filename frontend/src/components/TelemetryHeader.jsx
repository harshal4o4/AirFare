// src/components/TelemetryHeader.jsx — Light SaaS Theme
import React, { useState, useEffect } from 'react'
import { Plane, User } from 'lucide-react'

export default function TelemetryHeader() {
  const [timeStr, setTimeStr] = useState('')
  const [utcStr, setUtcStr]   = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTimeStr(now.toLocaleTimeString('en-IN', { hour12: false }))
      setUtcStr(now.toISOString().slice(11, 19))
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header style={{
      position: 'fixed', top: 0, left: 256, right: 0, height: 64,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
      zIndex: 40,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px',
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Plane size={17} style={{ color: '#8a8a8f' }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: '#111111', letterSpacing: '-0.02em' }}>
          National Airfare Price Index
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#8a8a8f',
          padding: '3px 10px', borderRadius: 99,
          background: '#f0f0f2', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          SIH26056
        </span>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Live pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 14px', borderRadius: 99,
          background: '#f4f4f6', border: '1px solid rgba(0,0,0,0.08)',
        }}>
          <span style={{ position: 'relative', display: 'flex', width: 7, height: 7 }}>
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: '#2ecc71', opacity: 0.5,
              animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
            }} />
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2ecc71', display: 'inline-block' }} />
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#2ecc71', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            LIVE
          </span>
          <span style={{ width: 1, height: 12, background: 'rgba(0,0,0,0.1)' }} />
          <span style={{ fontSize: 11, color: '#8a8a8f' }}>120ms</span>
        </div>

        {/* Clock */}
        <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111111' }}>{timeStr} <span style={{ color: '#8a8a8f', fontWeight: 400 }}>IST</span></p>
          <p style={{ fontSize: 10, color: '#8a8a8f' }}>{utcStr} UTC</p>
        </div>

        {/* User avatar */}
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: '#f0f0f2', border: '1px solid rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#8a8a8f',
        }}>
          <User size={15} />
        </div>
      </div>
    </header>
  )
}
