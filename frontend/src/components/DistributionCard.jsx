// src/components/DistributionCard.jsx — Light SaaS Theme
import React from 'react'
import { BarChart2 } from 'lucide-react'

export default function DistributionCard({ dist }) {
  if (!dist || dist.count === 0) return null

  const items = [
    { label: 'Minimum',               val: dist.min,              highlight: false },
    { label: 'P25',                   val: dist.p25,              highlight: false },
    { label: 'Median (P50)',          val: dist.median,           highlight: true  },
    { label: 'Average (Mean)',        val: Math.round(dist.mean), highlight: true  },
    { label: 'P75',                   val: dist.p75,              highlight: false },
    { label: 'Maximum',               val: dist.max,              highlight: false },
  ]

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart2 size={15} style={{ color: '#8a8a8f' }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111111' }}>Price Distribution Statistics</h3>
        </div>
        <span style={{ fontSize: 12, color: '#8a8a8f' }}>
          Based on {dist.count.toLocaleString()} observations
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6" style={{ gap: 12 }}>
        {items.map((item, idx) => (
          <div key={idx} style={{
            padding: '14px 16px', borderRadius: 14, textAlign: 'center',
            background: item.highlight ? '#111111' : '#f8f8fa',
          }}>
            <p style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
              color: item.highlight ? 'rgba(255,255,255,0.5)' : '#8a8a8f', marginBottom: 8,
            }}>
              {item.label}
            </p>
            <p style={{
              fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              color: item.highlight ? '#ffffff' : '#111111',
            }}>
              ₹{item.val.toLocaleString('en-IN')}
            </p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: '#8a8a8f', fontStyle: 'italic', marginTop: 16 }}>
        * Displaying full percentile spectrum eliminates outlier distortion caused by premium last-minute bookings.
      </p>
    </div>
  )
}
