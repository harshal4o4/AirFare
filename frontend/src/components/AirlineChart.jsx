// src/components/AirlineChart.jsx
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell
} from 'recharts'
import { PlaneTakeoff } from 'lucide-react'

const COLORS = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#ec4899']

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="card p-3 text-xs shadow-xl min-w-[200px]">
      <p className="font-bold text-white mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--text-secondary)' }}>Avg Fare</span>
          <span className="font-bold text-white">₹{Math.round(d?.avg_fare).toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--text-secondary)' }}>Market Share</span>
          <span className="font-bold text-white">{d?.market_share_pct}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--text-secondary)' }}>Flights</span>
          <span className="font-bold text-white">{d?.flight_count?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--text-secondary)' }}>Non-stop</span>
          <span className="font-bold text-white">{d?.stop_breakdown?.non_stop?.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

export default function AirlineChart({ data, loading }) {
  if (loading) return <div className="card p-6 h-72 skeleton" />

  if (!data?.airlines?.length) return (
    <div className="card p-6 h-72 flex items-center justify-center">
      <p style={{ color: 'var(--text-muted)' }}>No airline data for this route</p>
    </div>
  )

  const chartData = data.airlines.map(a => ({
    ...a,
    name: a.airline.replace(' ', '\n'),
    avg_fare: Math.round(a.avg_fare),
  }))

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <PlaneTakeoff size={16} style={{ color: '#06b6d4' }} />
          <h2 className="text-sm font-bold text-white">Carrier Breakdown</h2>
          <span className="badge badge-neutral text-[10px]">{data.carriers} airlines</span>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Avg fare (INR) by carrier</span>
      </div>

      {/* Market share pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {data.airlines.map((a, i) => (
          <div key={a.airline} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
               style={{ background: `${COLORS[i % COLORS.length]}15`, border: `1px solid ${COLORS[i % COLORS.length]}30`, color: COLORS[i % COLORS.length] }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            {a.airline} {a.market_share_pct}%
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 20, left: -10 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" vertical={false} />
          <XAxis
            dataKey="airline"
            tick={{ fontSize: 10, fill: '#4a5a7a' }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#4a5a7a' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="avg_fare" name="Avg Fare" radius={[6, 6, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
