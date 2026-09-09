// src/components/Sidebar.jsx — Light SaaS Theme
import React from 'react'
import {
  Activity, Globe, TrendingUp, BarChart3,
  Flame, Zap, Radio, BarChart2, Map
} from 'lucide-react'

const ANALYTICS = [
  { id: 'live',             label: 'Live Terminal',      icon: Activity  },
  { id: 'route-matrix',    label: 'Route Matrix',       icon: Globe     },
  { id: 'market-overview', label: 'Market Overview',    icon: Map       },
  { id: 'carrier',         label: 'Carrier Breakdown',  icon: BarChart2 },
  { id: 'cpi',             label: 'CPI Correlation',    icon: TrendingUp },
  { id: 'lead',            label: 'Lead Forecast',      icon: BarChart3 },
]

const INTELLIGENCE = [
  { id: 'atf',    label: 'ATF Yields',     icon: Flame },
  { id: 'alerts', label: 'Anomaly Alerts', icon: Zap   },
]

function NavItem({ item, active, onClick }) {
  const Icon = item.icon
  return (
    <button
      onClick={() => onClick(item.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 600,
        width: '100%',
        textAlign: 'left',
        border: 'none',
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s',
        background: active ? '#111111' : 'transparent',
        color: active ? '#ffffff' : '#8a8a8f',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = active ? '#fff' : '#111111' }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? '#111111' : 'transparent'; e.currentTarget.style.color = active ? '#fff' : '#8a8a8f' }}
    >
      <Icon size={15} style={{ color: active ? '#ffffff' : '#8a8a8f', flexShrink: 0 }} />
      <span>{item.label}</span>
    </button>
  )
}

export default function Sidebar({ page, setPage }) {
  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, height: '100%', width: 256,
      background: '#ffffff',
      boxShadow: '1px 0 0 rgba(0,0,0,0.06)',
      zIndex: 50,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      userSelect: 'none',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Brand */}
        <div style={{
          height: 64, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 10,
            background: '#111111', color: '#ff6a1a',
          }}>
            <Radio size={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{
              fontFamily: "'Clash Display', 'Inter', sans-serif",
              fontSize: 14, fontWeight: 700, color: '#111111',
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              NAPI RADAR
            </span>
            <span style={{ fontSize: 10, color: '#ff6a1a', fontWeight: 600, letterSpacing: '0.06em' }}>
              SIH26056 CORE
            </span>
          </div>
        </div>

        {/* Nav */}
        <div style={{ padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a8a8f', padding: '0 12px', marginBottom: 6 }}>
              Analytics Terminals
            </p>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {ANALYTICS.map(item => (
                <NavItem key={item.id} item={item} active={page === item.id} onClick={setPage} />
              ))}
            </nav>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a8a8f', padding: '0 12px', marginBottom: 6 }}>
              Intelligence
            </p>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {INTELLIGENCE.map(item => (
                <NavItem key={item.id} item={item} active={page === item.id} onClick={setPage} />
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Engine Status */}
      <div style={{ padding: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: '#f4f4f6', borderRadius: 12,
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#8a8a8f', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Engine</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#2ecc71', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2ecc71', display: 'inline-block' }} />
            NOMINAL
          </span>
        </div>
        <p style={{ textAlign: 'center', fontSize: 10, color: '#8a8a8f', marginTop: 8 }}>SYS VER 4.2.1 · CALIBRATED</p>
      </div>
    </aside>
  )
}
