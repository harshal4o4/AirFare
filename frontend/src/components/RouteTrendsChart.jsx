// src/components/RouteTrendsChart.jsx
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts'
import { MapPin } from 'lucide-react'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card p-3 text-xs shadow-xl min-w-[180px]">
      <p className="font-semibold text-white mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4 mb-1">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold text-white">₹{Math.round(p.value).toLocaleString('en-IN')}</span>
        </div>
      ))}
    </div>
  )
}

export default function RouteTrendsChart({ data, loading, source, destination }) {
  if (loading) return <div className="card p-6 h-72 skeleton" />

  if (!data?.series?.length) return (
    <div className="card p-6 h-72 flex items-center justify-center">
      <p style={{ color: 'var(--text-muted)' }}>Select a route to view trends</p>
    </div>
  )

  const chartData = data.series.map(d => ({
    date:     d.date.slice(5),
    avg_fare: Math.round(d.avg_fare),
    min_fare: d.min_fare,
    max_fare: d.max_fare,
  }))

  const s = data.summary

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-2">
          <MapPin size={16} style={{ color: '#f59e0b' }} />
          <h2 className="text-sm font-bold text-white">Route Price Tracker</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
            {source} → {destination}
          </span>
        </div>
      </div>

      {/* summary mini-stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Min Fare',  val: `₹${s.overall_min_fare?.toLocaleString('en-IN')}`, color: '#10b981' },
          { label: 'Avg Fare',  val: `₹${Math.round(s.overall_avg_fare)?.toLocaleString('en-IN')}`, color: '#f59e0b' },
          { label: 'Max Fare',  val: `₹${s.overall_max_fare?.toLocaleString('en-IN')}`, color: '#f43f5e' },
        ].map(({ label, val, color }) => (
          <div key={label} className="rounded-xl p-3 text-center"
               style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
            <p className="text-[10px] uppercase tracking-wider mb-1"
               style={{ color: 'var(--text-secondary)' }}>{label}</p>
            <p className="text-base font-bold" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="maxGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#4a5a7a' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: '#4a5a7a' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="max_fare" name="Max" stroke="#f43f5e" strokeWidth={1} fill="url(#maxGrad)" strokeDasharray="4 2" dot={false} />
          <Area type="monotone" dataKey="avg_fare" name="Avg" stroke="#f59e0b" strokeWidth={2} fill="url(#avgGrad)" dot={false} activeDot={{ r: 4 }} />
          <Area type="monotone" dataKey="min_fare" name="Min" stroke="#10b981" strokeWidth={1} fill="none" strokeDasharray="4 2" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
