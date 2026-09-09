// src/components/GeographicTree.jsx — Light SaaS Theme
import React from 'react'
import { MapPin, Globe } from 'lucide-react'

export default function GeographicTree({ geography }) {
  if (!geography || !geography.regions) return null

  return (
    <div className="card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={15} style={{ color: '#8a8a8f' }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111111' }}>
            Geographic &amp; Regional Market Hierarchy
          </h3>
        </div>
        <span style={{ fontSize: 12, color: '#8a8a8f' }}>National Index = {geography.national_index}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: 14 }}>
        {geography.regions.map((reg, idx) => (
          <div key={idx} style={{
            padding: '18px 20px', borderRadius: 16,
            background: '#f8f8fa',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111111', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={12} style={{ color: '#8a8a8f', flexShrink: 0 }} /> {reg.region} Region
              </span>
              <span style={{
                padding: '3px 10px', borderRadius: 8, background: '#ededef',
                fontSize: 11, fontWeight: 600, color: '#8a8a8f', fontVariantNumeric: 'tabular-nums',
              }}>
                Index {reg.region_index}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#8a8a8f' }}>Avg Fare</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#111111', fontVariantNumeric: 'tabular-nums' }}>
                ₹{reg.average_fare.toLocaleString('en-IN')}
              </span>
            </div>

            <div style={{ fontSize: 11, color: '#8a8a8f', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 10 }}>
              Cities: {reg.cities.join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
