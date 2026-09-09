// src/components/StatCards.jsx — Light SaaS Theme
import { TrendingUp, TrendingDown, IndianRupee, Route, BarChart3, Minus } from 'lucide-react'

function StatCard({ icon: Icon, label, value, sub, trend }) {
  const isUp   = trend > 0
  const isDown = trend < 0

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px !important' }}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={14} style={{ color: '#8a8a8f', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#8a8a8f' }}>
          {label}
        </span>
      </div>

      {/* Value */}
      <div>
        <p style={{ fontSize: 34, fontWeight: 800, color: '#111111', lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {sub && <span style={{ fontSize: 12, color: '#8a8a8f' }}>{sub}</span>}
          {trend !== undefined && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
              background: isUp ? 'rgba(46,204,113,0.10)' : isDown ? 'rgba(255,77,77,0.10)' : 'rgba(0,0,0,0.06)',
              color: isUp ? '#2ecc71' : isDown ? '#ff4d4d' : '#8a8a8f',
            }}>
              {isUp ? <TrendingUp size={11} /> : isDown ? <TrendingDown size={11} /> : <Minus size={11} />}
              {trend > 0 ? '+' : ''}{typeof trend === 'number' ? trend.toFixed(2) : trend}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StatCards({ series }) {
  if (!series || series.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 16 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card skeleton" style={{ height: 120 }} />
        ))}
      </div>
    )
  }

  const latest  = series[series.length - 1]
  const prev    = series[series.length - 2]
  const first   = series[0]
  const dayChangePct   = prev ? ((latest.index_value - prev.index_value) / prev.index_value) * 100 : 0
  const dayChange      = prev ? latest.index_value - prev.index_value : 0
  const totalChangePct = ((latest.index_value - first.index_value) / first.index_value) * 100

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 16 }}>
      <StatCard icon={BarChart3} label="Current Index"
        value={latest.index_value.toFixed(2)} sub={`Base 100 on ${first.date}`} trend={dayChangePct} />
      <StatCard icon={dayChangePct >= 0 ? TrendingUp : TrendingDown} label="24h Change"
        value={`${dayChangePct >= 0 ? '+' : ''}${dayChangePct.toFixed(2)}%`}
        sub={`Δ ${dayChange >= 0 ? '+' : ''}${dayChange.toFixed(2)} pts`} trend={dayChangePct} />
      <StatCard icon={IndianRupee} label="Avg Domestic Fare"
        value={`₹${Math.round(latest.avg_fare).toLocaleString('en-IN')}`}
        sub={`${latest.flight_count.toLocaleString()} flights`} trend={totalChangePct} />
      <StatCard icon={Route} label="Days Tracked"
        value={series.length} sub={`${first.date} → ${latest.date}`} />
    </div>
  )
}
