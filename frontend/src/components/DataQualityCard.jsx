// src/components/DataQualityCard.jsx — Light SaaS Theme
import React from 'react'
import { ShieldCheck, CheckCircle2, Clock } from 'lucide-react'

export default function DataQualityCard({ quality }) {
  if (!quality) return null

  const cells = [
    { label: 'Collected',    val: quality.observations_collected.toLocaleString('en-IN'), color: '#111111' },
    { label: 'Valid Records',val: quality.valid_observations.toLocaleString('en-IN'),     color: '#2ecc71' },
    { label: 'Routes',       val: quality.routes_covered,                                 color: '#111111' },
    { label: 'Airlines',     val: quality.airlines_covered,                               color: '#111111' },
    { label: 'OTAs Tracked', val: quality.otas_covered,                                  color: '#111111' },
    { label: 'Last Updated', val: quality.last_updated,                                   color: '#8a8a8f', small: true },
  ]

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={15} style={{ color: '#8a8a8f' }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111111' }}>
            Data Quality &amp; Governance Audit
          </h3>
        </div>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', borderRadius: 99,
          background: 'rgba(46,204,113,0.10)', fontSize: 12, fontWeight: 700, color: '#2ecc71',
        }}>
          <CheckCircle2 size={12} /> {quality.validation_rate_pct}% Valid
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6" style={{ gap: 12 }}>
        {cells.map((c, i) => (
          <div key={i} style={{ padding: '14px 16px', borderRadius: 14, background: '#f8f8fa', textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#8a8a8f', marginBottom: 6 }}>
              {c.label}
            </p>
            {c.small
              ? <p style={{ fontSize: 11, fontWeight: 600, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Clock size={11} style={{ color: '#8a8a8f' }} /> {c.val}
                </p>
              : <p style={{ fontSize: 16, fontWeight: 800, color: c.color, fontVariantNumeric: 'tabular-nums' }}>{c.val}</p>
            }
          </div>
        ))}
      </div>
    </div>
  )
}
