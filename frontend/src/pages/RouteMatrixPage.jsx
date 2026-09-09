// src/pages/RouteMatrixPage.jsx
import { useEffect, useState, useCallback } from 'react'
import FilterBar from '../components/FilterBar'
import IndexChart from '../components/IndexChart'
import RouteTrendsChart from '../components/RouteTrendsChart'
import LeadtimeChart from '../components/LeadtimeChart'
import DistributionCard from '../components/DistributionCard'
import {
  fetchTimeseries, fetchRouteTrends, fetchLeadtime, fetchDistribution
} from '../api'

const DEFAULT_FILTERS = { source: 'Bangalore', destination: 'Delhi', cls: 'Economy' }

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
        const fields = ['index_value', 'avg_fare', 'rolling_avg_7d', 'pct_change']
        for (let d = 1; d < gapDays; d++) {
          const t = d / gapDays
          const gapDate = new Date(curr)
          gapDate.setDate(gapDate.getDate() + d)
          const point = { date: gapDate.toISOString().slice(0, 10), _interpolated: true }
          fields.forEach(f => {
            const a = series[i][f]; const b = series[i + 1][f]
            point[f] = a != null && b != null ? +(a + (b - a) * t).toFixed(4) : null
          })
          result.push(point)
        }
      }
    }
  }
  return result
}

export default function RouteMatrixPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [indexSeries, setIndexSeries] = useState(null)
  const [indexLoading, setIndexLoading] = useState(true)
  const [routeData, setRouteData] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [leadData, setLeadData] = useState(null)
  const [leadLoading, setLeadLoading] = useState(false)
  const [distribution, setDistribution] = useState(null)

  // Load global timeseries once
  useEffect(() => {
    fetchTimeseries()
      .then(ts => setIndexSeries(interpolateSeries(ts.series)))
      .catch(() => {})
      .finally(() => setIndexLoading(false))
  }, [])

  // Load filter-dependent data
  const loadRoute = useCallback(() => {
    const { source, destination, cls } = filters
    if (!source || !destination) return
    setRouteLoading(true); setLeadLoading(true)
    Promise.all([
      fetchRouteTrends(source, destination, cls),
      fetchLeadtime(source, destination, cls),
      fetchDistribution(source, destination, cls),
    ])
      .then(([route, lead, dist]) => {
        setRouteData(route); setLeadData(lead); setDistribution(dist)
      })
      .catch(console.error)
      .finally(() => { setRouteLoading(false); setLeadLoading(false) })
  }, [filters])

  useEffect(() => { loadRoute() }, [loadRoute])

  return (
    <div className="space-y-6">
      <FilterBar filters={filters} setFilters={setFilters} />
      <IndexChart series={indexSeries} loading={indexLoading} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RouteTrendsChart
          data={routeData} loading={routeLoading}
          source={filters.source} destination={filters.destination}
        />
        <LeadtimeChart data={leadData} loading={leadLoading} />
      </div>
      <DistributionCard dist={distribution} />
    </div>
  )
}
