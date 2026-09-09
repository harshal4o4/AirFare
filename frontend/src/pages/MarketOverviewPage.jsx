// src/pages/MarketOverviewPage.jsx
import { useEffect, useState } from 'react'
import GeographicTree from '../components/GeographicTree'
import DataQualityCard from '../components/DataQualityCard'
import { fetchGeography, fetchQuality } from '../api'

export default function MarketOverviewPage() {
  const [geography, setGeography] = useState(null)
  const [quality, setQuality] = useState(null)

  useEffect(() => {
    fetchGeography().then(setGeography).catch(() => {})
    fetchQuality().then(setQuality).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a8a8f', marginBottom: 4 }}>
          Market Overview
        </p>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111111', letterSpacing: '-0.03em' }}>Geographic &amp; Regional Intelligence</h2>
      </div>
      <GeographicTree geography={geography} />
      <DataQualityCard quality={quality} />
    </div>
  )
}
