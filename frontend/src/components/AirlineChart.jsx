// src/components/AirlineChart.jsx — Light SaaS Theme with Smooth Bar Growth Animation
import React, { useEffect, useState, useRef } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell
} from 'recharts'
import { PlaneTakeoff } from 'lucide-react'

// Original light theme palette
const COLORS = ['#111111', '#6b7280', '#374151', '#9ca3af', '#4b5563', '#d1d5db', '#1f2937', '#6b7280']
const PILL_BG = ['rgba(17,17,17,0.08)', 'rgba(107,114,128,0.10)', 'rgba(55,65,81,0.08)', 'rgba(156,163,175,0.12)']

const TICK = { fontSize: 11, fill: '#8a8a8f', fontWeight: 500, fontFamily: 'Inter, system-ui' }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: '#ffffff', borderRadius: 14, padding: '12px 16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.10)', fontSize: 12, minWidth: 200,
      border: '1px solid rgba(0,0,0,0.06)'
    }}>
      <p style={{ color: '#111111', fontWeight: 700, marginBottom: 8 }}>{label}</p>
      {[
        { label: 'Avg Fare',    val: `₹${Math.round(d?.avg_fare).toLocaleString('en-IN')}` },
        { label: 'Market Share', val: `${d?.market_share_pct}%` },
        { label: 'Flights',     val: d?.flight_count?.toLocaleString() },
        { label: 'Non-stop',    val: d?.stop_breakdown?.non_stop?.toLocaleString() },
      ].map(r => (
        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <span style={{ color: '#8a8a8f' }}>{r.label}</span>
          <span style={{ color: '#111111', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.val}</span>
        </div>
      ))}
    </div>
  )
}

export default function AirlineChart({ data, loading }) {
  const containerRef = useRef(null)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimate(true)
        }
      },
      { threshold: 0.1 }
    )
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  if (loading) return <div className="card skeleton" style={{ height: 310 }} />

  if (!data?.airlines?.length) return (
    <div className="card" style={{ height: 310, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8a8a8f', fontSize: 14 }}>No airline data for this route</p>
    </div>
  )

  const chartData = data.airlines.map(a => ({ ...a, avg_fare: Math.round(a.avg_fare) }))

  return (
    <div className="card" ref={containerRef} style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PlaneTakeoff size={17} style={{ color: '#8a8a8f' }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111111', margin: 0 }}>Carrier Breakdown</h2>
          <span style={{ padding: '4px 12px', borderRadius: 8, background: '#f0f0f2', fontSize: 11, fontWeight: 600, color: '#8a8a8f' }}>
            {data.carriers} airlines
          </span>
        </div>
        <span style={{ fontSize: 12, color: '#8a8a8f' }}>Avg fare (INR) by carrier</span>
      </div>

      {/* Market share pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {data.airlines.map((a, i) => (
          <div key={a.airline} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
            background: PILL_BG[i % PILL_BG.length], color: COLORS[i % COLORS.length],
            border: '1px solid rgba(0,0,0,0.04)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
            {a.airline} {a.market_share_pct}%
          </div>
        ))}
      </div>

      {/* Bar Chart with Growth Animation */}
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 20, left: -10 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(0,0,0,0.05)" strokeWidth={1} vertical={false} />
          <XAxis dataKey="airline" tick={TICK} tickLine={false} axisLine={false} interval={0} />
          <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Bar
            dataKey="avg_fare"
            name="Avg Fare"
            radius={[8, 8, 0, 0]}
            isAnimationActive={animate}
            animationDuration={1600}
            animationEasing="ease-out"
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
