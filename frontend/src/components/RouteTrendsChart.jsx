// src/components/RouteTrendsChart.jsx — Light SaaS Theme
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts'
import { MapPin } from 'lucide-react'

const TICK = { fontSize: 11, fill: '#8a8a8f', fontWeight: 400, fontFamily: 'Inter, system-ui' }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#ffffff', borderRadius: 14, padding: '10px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.10)', fontSize: 12, minWidth: 180,
    }}>
      <p style={{ color: '#111111', fontWeight: 700, marginBottom: 8 }}>{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ color: '#111111', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            ₹{Math.round(p.value).toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function RouteTrendsChart({ data, loading, source, destination }) {
  if (loading) return <div className="card skeleton" style={{ height: 290 }} />

  if (!data?.series?.length) return (
    <div className="card" style={{ height: 290, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8a8a8f', fontSize: 14 }}>Select a route to view trends</p>
    </div>
  )

  const chartData = data.series.map(d => ({
    date: d.date.slice(5),
    avg_fare: Math.round(d.avg_fare),
    min_fare: d.min_fare,
    max_fare: d.max_fare,
  }))

  const s = data.summary

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={15} style={{ color: '#8a8a8f' }} />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111111' }}>Route Price Tracker</h2>
          <span style={{ padding: '3px 10px', borderRadius: 8, background: '#f0f0f2', fontSize: 11, fontWeight: 600, color: '#8a8a8f' }}>
            {source} → {destination}
          </span>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3" style={{ gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Min Fare',  val: `₹${s.overall_min_fare?.toLocaleString('en-IN')}`,          color: '#2ecc71' },
          { label: 'Avg Fare',  val: `₹${Math.round(s.overall_avg_fare)?.toLocaleString('en-IN')}`, color: '#111111' },
          { label: 'Max Fare',  val: `₹${s.overall_max_fare?.toLocaleString('en-IN')}`,          color: '#ff4d4d' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ padding: '12px 14px', borderRadius: 14, background: '#f8f8fa', textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#8a8a8f', marginBottom: 6 }}>{label}</p>
            <p style={{ fontSize: 15, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{val}</p>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="avgGradL" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#111111" stopOpacity={0.07} />
              <stop offset="100%" stopColor="#111111" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(0,0,0,0.05)" vertical={false} />
          <XAxis dataKey="date" tick={TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="max_fare" name="Max" stroke="#ff4d4d" strokeWidth={1.5}
            strokeDasharray="4 2" fill="none" dot={false} />
          <Area type="monotone" dataKey="avg_fare" name="Avg" stroke="#111111" strokeWidth={2.5}
            fill="url(#avgGradL)" dot={false} activeDot={{ r: 4, fill: '#111111', stroke: '#ffffff', strokeWidth: 2 }} />
          <Area type="monotone" dataKey="min_fare" name="Min" stroke="#2ecc71" strokeWidth={1.5}
            strokeDasharray="4 2" fill="none" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
