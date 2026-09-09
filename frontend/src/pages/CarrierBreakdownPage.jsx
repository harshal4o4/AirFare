// src/pages/CarrierBreakdownPage.jsx
import { useEffect, useState } from 'react'
import AirlineChart from '../components/AirlineChart'
import FilterBar from '../components/FilterBar'
import { fetchAirlines } from '../api'

const DEFAULT_FILTERS = { source: 'Bangalore', destination: 'Delhi', cls: 'Economy' }

export default function CarrierBreakdownPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [airlineData, setAirlineData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const { source, destination, cls } = filters
    if (!source || !destination) return
    setLoading(true)
    fetchAirlines(source, destination, cls)
      .then(setAirlineData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filters])

  return (
    <div className="space-y-6">
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a8a8f', marginBottom: 4 }}>
          Carrier Breakdown
        </p>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111111', letterSpacing: '-0.03em' }}>Airline Fare Comparison &amp; Market Share</h2>
      </div>
      <FilterBar filters={filters} setFilters={setFilters} />
      <AirlineChart data={airlineData} loading={loading} />
    </div>
  )
}
