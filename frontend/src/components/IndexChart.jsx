// src/components/IndexChart.jsx — Light SaaS Theme
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from 'recharts'
import { Activity } from 'lucide-react'

const TICK = { fontSize: 11, fill: '#8a8a8f', fontWeight: 400, fontFamily: 'Inter, system-ui' }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#ffffff', borderRadius: 14, padding: '10px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.10)', fontSize: 12, minWidth: 180,
    }}>
      <p style={{ color: '#111111', fontWeight: 700, marginBottom: 8 }}>{label}</p>
      {payload.map(p => p.value != null && (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <span style={{ color: '#8a8a8f' }}>{p.name}</span>
          <span style={{ color: '#111111', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {p.dataKey === 'avg_fare'
              ? `₹${Math.round(p.value).toLocaleString('en-IN')}`
              : p.value?.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )
}

function formatDate(str) {
  if (!str) return ''
  const [, m, d] = str.split('-')
  const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[+m]}-${d}`
}

export default function IndexChart({ series, loading }) {
  if (loading) return <div className="card skeleton" style={{ height: 340 }} />

  if (!series?.length) return (
    <div className="card" style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8a8a8f', fontSize: 14 }}>No index data available</p>
    </div>
  )

  const data = series.map(d => ({
    date: d.date, label: formatDate(d.date),
    index_value: d.index_value, rolling_7d: d.rolling_avg_7d, avg_fare: d.avg_fare,
  }))

  const minVal = Math.floor(Math.min(...data.map(d => d.index_value ?? 999)) - 2)
  const maxVal = Math.ceil( Math.max(...data.map(d => d.index_value ?? 0))   + 2)
  const latest = data[data.length - 1]

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={16} style={{ color: '#8a8a8f' }} />
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111111' }}>Composite Airfare Price Index</h2>
            <p style={{ fontSize: 12, color: '#8a8a8f', marginTop: 2 }}>
              Geometric-mean weighted · Base = 100 on {data[0]?.date}
            </p>
          </div>
        </div>
        {/* Current badge */}
        <div style={{ textAlign: 'right', padding: '8px 16px', borderRadius: 14, background: '#f4f4f6' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#8a8a8f' }}>Current</p>
          <p style={{ fontSize: 24, fontWeight: 800, color: '#111111', fontVariantNumeric: 'tabular-nums' }}>
            {latest.index_value?.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
        {[
          { color: '#111111', label: 'Daily Index', dash: false },
          { color: '#8a8a8f', label: '7-Day Rolling Avg', dash: true },
        ].map(({ color, label, dash }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#8a8a8f' }}>
            <svg width="22" height="2" style={{ overflow: 'visible' }}>
              <line x1="0" y1="1" x2="22" y2="1" stroke={color} strokeWidth="2"
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
            <linearGradient id="indexGradLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#111111" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#111111" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(0,0,0,0.05)" strokeWidth={1} vertical={false} />
          <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis domain={[minVal, maxVal]} tick={TICK} tickLine={false} axisLine={false} tickFormatter={v => v.toFixed(0)} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={100} stroke="rgba(0,0,0,0.10)" strokeDasharray="4 4"
            label={{ value: '100', position: 'right', fill: '#8a8a8f', fontSize: 11 }} />
          <Area type="monotone" dataKey="index_value" name="Index"
            stroke="#111111" strokeWidth={2.5} fill="url(#indexGradLight)"
            dot={false} activeDot={{ r: 5, fill: '#111111', stroke: '#ffffff', strokeWidth: 2 }} />
          <Area type="monotone" dataKey="rolling_7d" name="7d Avg"
            stroke="#8a8a8f" strokeWidth={2} strokeDasharray="6 3" fill="none"
            dot={false} activeDot={{ r: 4, fill: '#8a8a8f', stroke: '#ffffff', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
