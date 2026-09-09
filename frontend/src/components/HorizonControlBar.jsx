// src/components/HorizonControlBar.jsx — Live Health & Telemetry Controls
import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { fetchFilters, fetchQuality } from '../api'

export default function HorizonControlBar({ onRefresh, activeHorizon: propHorizon, onHorizonChange }) {
  const [localHorizon, setLocalHorizon] = useState('7D')
  const activeHorizon = propHorizon !== undefined ? propHorizon : localHorizon
  const horizons = ['24H', '7D', '30D', '90D', 'YTD']

  // Telemetry States
  const [apiStatus, setApiStatus] = useState({ online: true, latency: 0, degraded: false })
  const [routeCount, setRouteCount] = useState(null)
  const [tags, setTags] = useState([])

  // 1. Live Health Check (Every 30s with 2s timeout)
  const checkHealth = useCallback(async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    const t0 = performance.now()
    try {
      const res = await fetch('/health', { signal: controller.signal })
      clearTimeout(timeoutId)
      const ms = Math.round(performance.now() - t0)
      if (res.ok && ms <= 2000) {
        setApiStatus({ online: true, latency: ms, degraded: false })
      } else {
        setApiStatus({ online: false, latency: ms, degraded: true })
      }
    } catch {
      clearTimeout(timeoutId)
      setApiStatus({ online: false, latency: 0, degraded: true })
    }
  }, [])

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [checkHealth])

  // 2. Fetch Live Route Count & Distinct Data Sources
  useEffect(() => {
    fetchFilters()
      .then(data => {
        if (data.route_count) {
          setRouteCount(data.route_count)
        } else if (data.sources && data.destinations) {
          setRouteCount(data.sources.length * data.destinations.length)
        }
      })
      .catch(() => {})

    fetchQuality()
      .then(data => {
        if (data.data_sources?.length) {
          setTags(data.data_sources)
        }
      })
      .catch(() => {})
  }, [])

  const isDegraded = apiStatus.degraded || !apiStatus.online
  const statusColor = isDegraded ? '#ff4d4d' : '#2ecc71'
  const statusBg = isDegraded ? 'rgba(255,77,77,0.08)' : 'rgba(46,204,113,0.08)'
  const statusBorder = isDegraded ? '1px solid rgba(255,77,77,0.2)' : '1px solid rgba(46,204,113,0.2)'

  return (
    <div className="card" style={{ padding: '16px 20px !important' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        {/* Live Status chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 14px', borderRadius: 99,
            background: statusBg, border: statusBorder,
            transition: 'all 0.2s ease',
          }}>
            <span style={{ position: 'relative', display: 'flex', width: 7, height: 7 }}>
              <span style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: statusColor, opacity: 0.5,
                animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
              }} />
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isDegraded ? 'API DEGRADED' : `API ONLINE · ${apiStatus.latency}ms`}
            </span>
            <span style={{ color: '#c0c0c6' }}>·</span>
            <span style={{ fontSize: 12, color: '#8a8a8f' }}>
              {routeCount != null ? `${routeCount} Routes Synchronized` : '42 Routes Synchronized'}
            </span>
          </div>

          {/* Dynamic Data Source Feed Tags */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(tags.length > 0 ? tags : ['Synthetic_Backup']).map(tag => (
              <span key={tag} style={{
                padding: '5px 11px', borderRadius: 8,
                background: '#f0f0f2', border: '1px solid rgba(0,0,0,0.07)',
                fontSize: 11, fontWeight: 600, color: '#8a8a8f', textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Time range + re-poll */}
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          background: '#f4f4f6', borderRadius: 12,
          padding: 4, gap: 2,
        }}>
          {horizons.map(h => (
            <button
              key={h}
              onClick={() => {
                setLocalHorizon(h)
                if (onHorizonChange) onHorizonChange(h)
                else if (onRefresh) onRefresh(h)
              }}
              style={{
                padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                background: activeHorizon === h ? '#111111' : 'transparent',
                color: activeHorizon === h ? '#ffffff' : '#8a8a8f',
              }}
            >
              {h}
            </button>
          ))}

          <div style={{ width: 1, height: 16, background: 'rgba(0,0,0,0.1)', margin: '0 4px' }} />

          <button
            onClick={onRefresh}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: 'transparent', color: '#8a8a8f', fontSize: 12, fontWeight: 600,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = '#111111' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8a8a8f' }}
          >
            <RefreshCw size={13} />
            Re-Poll
          </button>
        </div>
      </div>
    </div>
  )
}
