// src/components/RouteSummaryGrid.jsx — Light SaaS Theme
import React from 'react'
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'

export default function RouteSummaryGrid({ routes = [] }) {
  if (!routes || routes.length === 0) return null

  return (
    <div>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111111', letterSpacing: '-0.02em' }}>
          Key DGCA Corridor Intelligence
        </h3>
        <span style={{ fontSize: 12, color: '#8a8a8f' }}>Live Traffic-Weighted Basket</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: 16 }}>
        {routes.map((r, i) => {
          const isPos = r.weekly_change_pct >= 0
          return (
            <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Route header */}
              <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#111111', marginBottom: 8 }}>
                  <span>{r.source}</span>
                  <ArrowRight size={13} style={{ color: '#8a8a8f', flexShrink: 0 }} />
                  <span>{r.destination}</span>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 8,
                  background: '#f0f0f2', fontSize: 11, fontWeight: 600, color: '#8a8a8f',
                }}>
                  Index {r.route_index}
                </span>
              </div>

              {/* Fare + change */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#8a8a8f', marginBottom: 4 }}>
                    Avg Fare
                  </p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#111111', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{r.average_fare.toLocaleString('en-IN')}
                  </p>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 11px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                  background: isPos ? 'rgba(46,204,113,0.10)' : 'rgba(255,77,77,0.10)',
                  color: isPos ? '#2ecc71' : '#ff4d4d',
                }}>
                  {isPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {isPos ? '+' : ''}{r.weekly_change_pct}% WoW
                </div>
              </div>

              {/* Min / Max */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
                borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 12, fontSize: 12,
              }}>
                <div>
                  <span style={{ color: '#8a8a8f' }}>Lowest: </span>
                  <span style={{ fontWeight: 700, color: '#111111', fontVariantNumeric: 'tabular-nums' }}>₹{r.lowest_fare.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: '#8a8a8f' }}>Highest: </span>
                  <span style={{ fontWeight: 700, color: '#111111', fontVariantNumeric: 'tabular-nums' }}>₹{r.highest_fare.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
