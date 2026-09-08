// src/components/IndexChart.jsx
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Area, AreaChart
} from 'recharts'
import { Activity } from 'lucide-react'

// ── Custom tooltip ────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid rgba(51,65,85,0.9)',
      borderRadius: 12,
      padding: '10px 14px',
      fontSize: 12,
      minWidth: 200,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      <p style={{ color: '#ffffff', fontWeight: 700, marginBottom: 8 }}>{label}</p>
      {payload.map(p => p.value != null && (
        <div key={p.dataKey}
             style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <span style={{ color: p.color, fontWeight: 500 }}>{p.name}</span>
          <span style={{ color: '#ffffff', fontWeight: 700 }}>
            {p.dataKey === 'avg_fare'
              ? `₹${Math.round(p.value).toLocaleString('en-IN')}`
              : p.value?.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Dot renderer — skip interpolated points ───────────────────────────────
const NoDot = () => null

// ── X-axis tick formatter — show date as Jan-16, Feb-01 etc ──────────────
function formatDate(str) {
  if (!str) return ''
  const [, m, d] = str.split('-')
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[+m]}-${d}`
}

export default function IndexChart({ series, loading }) {
  if (loading) {
    return (
      <div className="card p-6" style={{ height: 340 }}>
        <div className="skeleton" style={{ height: '100%', borderRadius: 10 }} />
      </div>
    )
  }

  if (!series?.length) {
    return (
      <div className="card p-6 flex items-center justify-center" style={{ height: 340 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No index data available</p>
      </div>
    )
  }

  const data = series.map(d => ({
    date:         d.date,
    label:        formatDate(d.date),
    index_value:  d.index_value,
    rolling_7d:   d.rolling_avg_7d,
    avg_fare:     d.avg_fare,
    _interpolated: d._interpolated,
  }))

  const minVal  = Math.floor(Math.min(...data.map(d => d.index_value ?? 999)) - 2)
  const maxVal  = Math.ceil( Math.max(...data.map(d => d.index_value ?? 0))   + 2)
  const latest  = data[data.length - 1]

  return (
    <div className="card p-6">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(59,130,246,0.2))',
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Activity size={16} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <h2 style={{ color: '#ffffff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
              Composite Airfare Price Index
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 2 }}>
              Geometric-mean weighted · Base = 100 on {data[0]?.date}
            </p>
          </div>
        </div>

        {/* Current index badge */}
        <div style={{
          textAlign: 'right',
          padding: '6px 14px',
          borderRadius: 10,
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.25)',
        }}>
          <p style={{ color: '#a5b4fc', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Current
          </p>
          <p style={{ color: '#ffffff', fontWeight: 800, fontSize: 22, lineHeight: 1.1 }}>
            {latest.index_value?.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
        {[
          { color: '#3b82f6', label: 'Daily Index', dash: false },
          { color: '#06b6d4', label: '7-Day Rolling Avg', dash: true },
        ].map(({ color, label, dash }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text-secondary)' }}>
            <svg width="22" height="2" style={{ overflow: 'visible' }}>
              <line x1="0" y1="1" x2="22" y2="1"
                    stroke={color} strokeWidth="2"
                    strokeDasharray={dash ? '5 3' : 'none'} />
            </svg>
            {label}
          </div>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 6, right: 16, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="indexGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(51,65,85,0.5)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#475569', fontFamily: 'Inter, system-ui' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minVal, maxVal]}
            tick={{ fontSize: 11, fill: '#475569', fontFamily: 'Inter, system-ui' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => v.toFixed(0)}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Base-100 reference line */}
          <ReferenceLine
            y={100}
            stroke="rgba(71,85,105,0.6)"
            strokeDasharray="4 3"
            label={{ value: '100', position: 'right', fill: '#475569', fontSize: 10 }}
          />

          {/* Gradient-filled area under daily index */}
          <Area
            type="monotone"
            dataKey="index_value"
            name="Index"
            stroke="#3b82f6"
            strokeWidth={2.5}
            fill="url(#indexGrad)"
            dot={NoDot}
            activeDot={{ r: 5, fill: '#3b82f6', stroke: '#1e3a8a', strokeWidth: 2 }}
          />

          {/* 7-day rolling average — dashed cyan */}
          <Area
            type="monotone"
            dataKey="rolling_7d"
            name="7d Avg"
            stroke="#06b6d4"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            fill="none"
            dot={NoDot}
            activeDot={{ r: 4, fill: '#06b6d4', stroke: '#164e63', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
