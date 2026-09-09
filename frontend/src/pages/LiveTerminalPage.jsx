// src/pages/LiveTerminalPage.jsx
import { useEffect, useState, useCallback } from 'react'
import HorizonControlBar from '../components/HorizonControlBar'
import InterpretationBanner from '../components/InterpretationBanner'
import StatCards from '../components/StatCards'
import RouteSummaryGrid from '../components/RouteSummaryGrid'
import { fetchTimeseries, fetchRouteSummary } from '../api'
import { AlertCircle, RefreshCw } from 'lucide-react'

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

export default function LiveTerminalPage() {
  const [activeHorizon, setActiveHorizon] = useState('7D')
  const [indexData, setIndexData] = useState(null)
  const [routeSummary, setRouteSummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback((horizon = activeHorizon) => {
    setLoading(true)
    Promise.all([fetchTimeseries(horizon), fetchRouteSummary()])
      .then(([ts, routes]) => {
        setIndexData({ ...ts, series: interpolateSeries(ts.series) })
        setRouteSummary(routes)
        setError(null)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [activeHorizon])

  useEffect(() => { load(activeHorizon) }, [activeHorizon, load])

  const latest = indexData?.series?.slice(-1)[0]

  return (
    <div className="space-y-6">
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '14px 20px', borderRadius: 14,
          background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={15} style={{ color: '#ff4d4d' }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: '#ff4d4d' }}>Backend Offline — {error}</p>
          </div>
          <button onClick={() => load(activeHorizon)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 10, border: '1px solid rgba(255,77,77,0.2)',
            background: 'rgba(255,77,77,0.08)', color: '#ff4d4d', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      <HorizonControlBar onRefresh={() => load(activeHorizon)} activeHorizon={activeHorizon} onHorizonChange={setActiveHorizon} />
      <InterpretationBanner
        indexValue={latest?.index_value ?? 127.4}
        pctChange={latest?.pct_change ?? 4.2}
        yoyChange={8.7}
      />
      <StatCards series={loading ? null : indexData?.series} />
      <RouteSummaryGrid routes={routeSummary} />
    </div>
  )
}
