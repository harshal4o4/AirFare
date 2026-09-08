// src/components/LeadtimeChart.jsx
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from 'recharts'
import { Clock } from 'lucide-react'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="card p-3 text-xs shadow-xl min-w-[180px]">
      <p className="font-semibold text-white mb-2">{label} days before flight</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span style={{ color: '#10b981' }}>Min</span>
          <span className="font-bold text-white">₹{d?.min_fare?.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: '#3b82f6' }}>Avg</span>
          <span className="font-bold text-white">₹{Math.round(d?.avg_fare)?.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: '#f43f5e' }}>Max</span>
          <span className="font-bold text-white">₹{d?.max_fare?.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Samples</span>
          <span className="font-bold text-white">{d?.flight_count?.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

export default function LeadtimeChart({ data, loading }) {
  if (loading) return <div className="card p-6 h-72 skeleton" />

  if (!data?.series?.length) return (
    <div className="card p-6 h-72 flex items-center justify-center">
      <p style={{ color: 'var(--text-muted)' }}>Select a route to view lead-time curve</p>
    </div>
  )

  const chartData = data.series.map(d => ({
    ...d,
    avg_fare: Math.round(d.avg_fare),
  }))

  // Find the sweet-spot: lowest avg fare day
  const minPoint = chartData.reduce((a, b) => a.avg_fare < b.avg_fare ? a : b)

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Clock size={16} style={{ color: '#a855f7' }} />
          <h2 className="text-sm font-bold text-white">Booking Lead-time Curve</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full"
             style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#a855f7' }}>
          💡 Best price at <strong className="ml-1">{minPoint.days_left} days</strong>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" vertical={false} />
          <XAxis
            dataKey="days_left"
            tick={{ fontSize: 11, fill: '#4a5a7a' }}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Days Before Journey', position: 'insideBottom', offset: -2, fill: '#4a5a7a', fontSize: 11 }}
            height={36}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#4a5a7a' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            x={minPoint.days_left}
            stroke="#a855f7"
            strokeDasharray="4 2"
            strokeWidth={1}
          />
          <Area
            type="monotone"
            dataKey="avg_fare"
            name="Avg Fare"
            stroke="#a855f7"
            strokeWidth={2}
            fill="url(#leadGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#a855f7' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
