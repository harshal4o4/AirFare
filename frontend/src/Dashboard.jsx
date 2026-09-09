// src/Dashboard.jsx — Light SaaS shell router
import { useState } from 'react'
import Sidebar from './components/Sidebar'
import TelemetryHeader from './components/TelemetryHeader'
import LiveTerminalPage from './pages/LiveTerminalPage'
import RouteMatrixPage from './pages/RouteMatrixPage'
import MarketOverviewPage from './pages/MarketOverviewPage'
import CarrierBreakdownPage from './pages/CarrierBreakdownPage'
import StubPage from './pages/StubPage'

const PAGE_TITLES = {
  'live':             'Live Terminal',
  'route-matrix':     'Route Matrix',
  'market-overview':  'Market Overview',
  'carrier':          'Carrier Breakdown',
  'cpi':              'CPI Correlation',
  'lead':             'Lead Forecast',
  'atf':              'ATF Yields',
  'alerts':           'Anomaly Alerts',
}

function PageContent({ page }) {
  switch (page) {
    case 'live':            return <LiveTerminalPage />
    case 'route-matrix':    return <RouteMatrixPage />
    case 'market-overview': return <MarketOverviewPage />
    case 'carrier':         return <CarrierBreakdownPage />
    case 'cpi':             return (
      <StubPage title="CPI Correlation Terminal"
        description="Consumer Price Index correlation analysis against airfare movements — calibrating models." />
    )
    case 'lead':            return (
      <StubPage title="Lead-time Forecast Engine"
        description="Predictive booking window and demand-curve forecasting — coming in next release." />
    )
    case 'atf':             return (
      <StubPage title="ATF Yields Intelligence"
        description="Aviation Turbine Fuel price correlation and yield impact analysis — under construction." />
    )
    case 'alerts':          return (
      <StubPage title="Anomaly Alerts System"
        description="Real-time statistical anomaly detection across all corridors — calibrating alert thresholds." />
    )
    default:                return <LiveTerminalPage />
  }
}

export default function Dashboard() {
  const [page, setPage] = useState('live')

  return (
    <div style={{ background: '#f4f4f6', minHeight: '100vh', display: 'flex' }}>
      <Sidebar page={page} setPage={setPage} />

      <div style={{ paddingLeft: 256, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TelemetryHeader />

        <main
          key={page}
          style={{
            paddingTop: 80, paddingBottom: 40,
            paddingLeft: 32, paddingRight: 32,
            maxWidth: 1600, width: '100%', margin: '0 auto',
          }}
        >
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#8a8a8f', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              NAPI RADAR
            </span>
            <span style={{ color: '#d0d0d6' }}>/</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {PAGE_TITLES[page] ?? page}
            </span>
          </div>

          <PageContent page={page} />

          <footer style={{
            textAlign: 'center', padding: '28px 0 8px',
            fontSize: 11, color: '#c0c0c6', letterSpacing: '0.04em',
            borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 40,
          }}>
            NAPI RADAR (SIH26056) · Official MoSPI / DGCA Statistical Aviation Terminal · System Ver 4.2.1
          </footer>
        </main>
      </div>
    </div>
  )
}
