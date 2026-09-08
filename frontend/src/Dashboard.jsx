// src/Dashboard.jsx
import { useEffect, useState, useCallback } from 'react'
import Navbar from './components/Navbar'
import StatCards from './components/StatCards'
import FilterBar from './components/FilterBar'
import IndexChart from './components/IndexChart'
import RouteTrendsChart from './components/RouteTrendsChart'
import AirlineChart from './components/AirlineChart'
import LeadtimeChart from './components/LeadtimeChart'
import { fetchTimeseries, fetchRouteTrends, fetchAirlines, fetchLeadtime } from './api'
import { AlertCircle, RefreshCw } from 'lucide-react'

// ── Default: Bangalore → Delhi Economy (10,536 records — densest route) ──
const DEFAULT_FILTERS = { source: 'Bangalore', destination: 'Delhi', cls: 'Economy' }

// ── Fill date gaps with linear interpolation so chart lines render smooth ──
function interpolateSeries(series) {
  if (!series?.length) return series

  const result = []
  for (let i = 0; i < series.length; i++) {
    result.push(series[i])

    if (i < series.length - 1) {
      const curr = new Date(series[i].date)
      const next = new Date(series[i + 1].date)
      const gapDays = Math.round((next - curr) / 86_400_000)

      if (gapDays > 1) {
        // Linear interpolation across the gap
        const fields = ['index_value', 'avg_fare', 'rolling_avg_7d', 'pct_change']
        for (let d = 1; d < gapDays; d++) {
          const t = d / gapDays
          const gapDate = new Date(curr)
          gapDate.setDate(gapDate.getDate() + d)
          const point = { date: gapDate.toISOString().slice(0, 10), _interpolated: true }
          fields.forEach(f => {
            const a = series[i][f]
            const b = series[i + 1][f]
            point[f] = a != null && b != null ? +(a + (b - a) * t).toFixed(4) : null
          })
          result.push(point)
        }
      }
    }
  }
  return result
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between gap-3 p-4 rounded-2xl mb-4"
         style={{ background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.2)' }}>
      <div className="flex items-center gap-3">
        <AlertCircle size={16} className="shrink-0" style={{ color: '#fb7185' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: '#fb7185' }}>Backend Offline</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {message ?? 'Cannot connect to FastAPI at localhost:8000. Start the server with: uvicorn main:app --reload'}
          </p>
        </div>
      </div>
      {onRetry && (
        <button onClick={onRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium shrink-0"
                style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: '#fb7185' }}>
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  // Global index (not filter-dependent)
  const [indexData, setIndexData]       = useState(null)
  const [indexLoading, setIndexLoading] = useState(true)
  const [indexError, setIndexError]     = useState(null)

  // Route-dependent data
  const [routeData, setRouteData]         = useState(null)
  const [routeLoading, setRouteLoading]   = useState(false)
  const [airlineData, setAirlineData]     = useState(null)
  const [airlineLoading, setAirlineLoading] = useState(false)
  const [leadData, setLeadData]           = useState(null)
  const [leadLoading, setLeadLoading]     = useState(false)

  // Fetch global price index once
  const loadIndex = useCallback(() => {
    setIndexLoading(true)
    fetchTimeseries()
      .then(d => {
        setIndexData({ ...d, series: interpolateSeries(d.series) })
        setIndexError(null)
      })
      .catch(e => setIndexError(e.message))
      .finally(() => setIndexLoading(false))
  }, [])

  useEffect(() => { loadIndex() }, [loadIndex])

  // Fetch route-specific data whenever filters change
  const loadRouteData = useCallback(() => {
    const { source, destination, cls } = filters
    if (!source || !destination) return

    setRouteLoading(true)
    setAirlineLoading(true)
    setLeadLoading(true)

    Promise.all([
      fetchRouteTrends(source, destination, cls),
      fetchAirlines(source, destination, cls),
      fetchLeadtime(source, destination, cls),
    ])
      .then(([route, airlines, lead]) => {
        setRouteData(route)
        setAirlineData(airlines)
        setLeadData(lead)
      })
      .catch(console.error)
      .finally(() => {
        setRouteLoading(false)
        setAirlineLoading(false)
        setLeadLoading(false)
      })
  }, [filters])

  useEffect(() => { loadRouteData() }, [loadRouteData])

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-6 py-8 space-y-5">

        {indexError && <ErrorBanner message={indexError} onRetry={loadIndex} />}

        {/* KPI Cards */}
        <StatCards series={indexData?.series} />

        {/* Filter Bar */}
        <FilterBar filters={filters} setFilters={setFilters} />

        {/* Full-width price index */}
        <IndexChart series={indexData?.series} loading={indexLoading} />

        {/* Route trends + lead-time side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <RouteTrendsChart
            data={routeData}
            loading={routeLoading}
            source={filters.source}
            destination={filters.destination}
          />
          <LeadtimeChart data={leadData} loading={leadLoading} />
        </div>

        {/* Airline comparison */}
        <AirlineChart data={airlineData} loading={airlineLoading} />

        <footer className="text-center py-6 text-xs" style={{ color: 'var(--text-muted)' }}>
          National Airfare Price Index &nbsp;·&nbsp; Jan – Mar 2023 &nbsp;·&nbsp; 452,088 records &nbsp;·&nbsp; FastAPI + PostgreSQL + React
        </footer>
      </main>
    </div>
  )
}
