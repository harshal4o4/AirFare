// src/components/StatCards.jsx
import { TrendingUp, TrendingDown, IndianRupee, Route, BarChart3, Minus } from 'lucide-react'

function StatCard({ icon: Icon, label, value, sub, trend, color }) {
  const trendIcon = trend > 0
    ? <TrendingUp size={13} />
    : trend < 0
    ? <TrendingDown size={13} />
    : <Minus size={13} />

  const badgeClass = trend > 0 ? 'badge-up' : trend < 0 ? 'badge-down' : 'badge-neutral'

  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${color}15`,
          border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>

      <div>
        <p style={{ color: '#ffffff', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {value}
        </p>
        {sub && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 4 }}>{sub}</p>
        )}
      </div>

      {trend !== undefined && (
        <span className={`badge ${badgeClass} self-start`}>
          {trendIcon}
          {trend > 0 ? '+' : ''}{typeof trend === 'number' ? trend.toFixed(2) : trend}%
        </span>
      )}
    </div>
  )
}

export default function StatCards({ series }) {
  if (!series || series.length === 0) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5 h-36 skeleton" />
        ))}
      </div>
    )
  }

  const latest  = series[series.length - 1]
  const prev    = series[series.length - 2]
  const first   = series[0]

  const dayChange     = prev ? latest.index_value - prev.index_value : 0
  const dayChangePct  = prev ? (dayChange / prev.index_value) * 100 : 0
  const totalChangePct = ((latest.index_value - first.index_value) / first.index_value) * 100

  const uniqueRoutes = new Set(series.map(s => s.date)).size

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={BarChart3}
        label="Current Index"
        value={latest.index_value.toFixed(2)}
        sub={`Base 100 on ${first.date}`}
        trend={dayChangePct}
        color="#6366f1"
      />
      <StatCard
        icon={dayChangePct >= 0 ? TrendingUp : TrendingDown}
        label="24h Change"
        value={`${dayChangePct >= 0 ? '+' : ''}${dayChangePct.toFixed(2)}%`}
        sub={`Index Δ ${dayChange >= 0 ? '+' : ''}${dayChange.toFixed(2)} pts`}
        trend={dayChangePct}
        color={dayChangePct >= 0 ? '#10b981' : '#f43f5e'}
      />
      <StatCard
        icon={IndianRupee}
        label="Avg Domestic Fare"
        value={`₹${Math.round(latest.avg_fare).toLocaleString('en-IN')}`}
        sub={`${latest.flight_count.toLocaleString()} flights on ${latest.date}`}
        trend={totalChangePct}
        color="#f59e0b"
      />
      <StatCard
        icon={Route}
        label="Days Tracked"
        value={series.length}
        sub={`${first.date} → ${latest.date}`}
        color="#06b6d4"
      />
    </div>
  )
}
