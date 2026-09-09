// src/components/LeadtimeChart.jsx — Light SaaS Theme
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from 'recharts'
import { Clock } from 'lucide-react'

const TICK = { fontSize: 11, fill: '#8a8a8f', fontWeight: 400, fontFamily: 'Inter, system-ui' }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: '#ffffff', borderRadius: 14, padding: '10px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.10)', fontSize: 12, minWidth: 180,
    }}>
      <p style={{ color: '#111111', fontWeight: 700, marginBottom: 8 }}>{label} days before flight</p>
      {[
        { label: 'Min', val: `₹${d?.min_fare?.toLocaleString('en-IN')}`,        color: '#2ecc71' },
        { label: 'Avg', val: `₹${Math.round(d?.avg_fare)?.toLocaleString('en-IN')}`, color: '#111111' },
        { label: 'Max', val: `₹${d?.max_fare?.toLocaleString('en-IN')}`,        color: '#ff4d4d' },
      ].map(r => (
        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <span style={{ color: r.color, fontWeight: 600 }}>{r.label}</span>
          <span style={{ color: '#111111', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.val}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 4 }}>
        <span style={{ color: '#8a8a8f' }}>Samples</span>
        <span style={{ color: '#111111', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {d?.flight_count?.toLocaleString()}
        </span>
      </div>
    </div>
  )
}

export default function LeadtimeChart({ data, loading }) {
  if (loading) return <div className="card skeleton" style={{ height: 290 }} />

  if (!data?.series?.length) return (
    <div className="card" style={{ height: 290, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8a8a8f', fontSize: 14 }}>Select a route to view lead-time curve</p>
    </div>
  )

  const chartData = data.series.map(d => ({ ...d, avg_fare: Math.round(d.avg_fare) }))
  const minPoint  = chartData.reduce((a, b) => a.avg_fare < b.avg_fare ? a : b)

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={15} style={{ color: '#8a8a8f' }} />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111111' }}>Booking Lead-time Curve</h2>
        </div>
        <div style={{ padding: '5px 12px', borderRadius: 99, background: '#f0f0f2', fontSize: 12, color: '#8a8a8f' }}>
          Best price at <strong style={{ color: '#111111' }}>{minPoint.days_left} days</strong>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="leadGradL" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#111111" stopOpacity={0.07} />
              <stop offset="100%" stopColor="#111111" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(0,0,0,0.05)" vertical={false} />
          <XAxis dataKey="days_left" tick={TICK} tickLine={false} axisLine={false}
            label={{ value: 'Days Before Journey', position: 'insideBottom', offset: -2, fill: '#8a8a8f', fontSize: 11 }}
            height={36} />
          <YAxis tick={TICK} tickLine={false} axisLine={false}
            tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={minPoint.days_left} stroke="rgba(0,0,0,0.15)" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="avg_fare" name="Avg Fare"
            stroke="#111111" strokeWidth={2.5} fill="url(#leadGradL)"
            dot={false} activeDot={{ r: 4, fill: '#111111', stroke: '#ffffff', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
