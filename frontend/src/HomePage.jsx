// src/HomePage.jsx — Single Page Vertical Scroll Dashboard (3D Glass SaaS Theme)
import { useEffect, useRef, useState, useCallback } from 'react'
import HorizonControlBar from './components/HorizonControlBar'
import InterpretationBanner from './components/InterpretationBanner'
import StatCards from './components/StatCards'
import FilterBar from './components/FilterBar'
import IndexChart from './components/IndexChart'
import RouteTrendsChart from './components/RouteTrendsChart'
import DistributionCard from './components/DistributionCard'
import GeographicTree from './components/GeographicTree'
import DataQualityCard from './components/DataQualityCard'
import AirlineChart from './components/AirlineChart'
import {
  fetchTimeseries, fetchRouteTrends, fetchDistribution,
  fetchGeography, fetchQuality, fetchAirlines
} from './api'
import { AlertCircle, RefreshCw, ChevronDown } from 'lucide-react'

// ── Intersection Observer hook for scroll animations ─────────────────────────
function useInView(options = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        obs.unobserve(el)
      }
    }, { threshold: 0.08, ...options })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, inView]
}

// ── Interpolate timeseries helper ───────────────────────────────────────────
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

// ── Navbar (3D Glass header with centered 4-section links) ─────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navItems = [
    { label: 'Live Terminal', id: 'live-terminal' },
    { label: 'Route Matrix', id: 'route-matrix' },
    { label: 'Market Overview', id: 'market-overview' },
    { label: 'Carrier Breakdown', id: 'carrier-breakdown' },
  ]

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className={`hp-nav ${scrolled ? 'hp-nav--scrolled' : ''}`}>
      <div className="hp-nav-inner">
        {/* Brand */}
        <div className="hp-nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
          </svg>
          <span>AIRTREND</span>
        </div>

        {/* 4 Section Links Centered in Middle */}
        <div className="hp-nav-links">
          {navItems.map(item => (
            <button key={item.id} className="hp-nav-link" onClick={() => scrollTo(item.id)}>
              {item.label}
            </button>
          ))}
        </div>

        {/* Right Balance Placeholder for exact centering */}
        <div style={{ justifySelf: 'end', visibility: 'hidden' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>AIRTREND</span>
        </div>
      </div>
    </nav>
  )
}

// ── Hero Section ────────────────────────────────────────────────────────────
function HeroSection() {
  const [ref, inView] = useInView({ threshold: 0.05 })

  const scrollDown = () => {
    document.getElementById('live-terminal')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="hero" className="hp-hero" ref={ref}>
      <div className="hp-hero-grid" />
      <div className="hp-hero-gradient" />

      <div className={`hp-hero-content ${inView ? 'hp-anim-in' : ''}`}>
        <h1 className="hp-hero-title">AIRTREND</h1>
        <p className="hp-hero-tagline">Track fares. above the noise.</p>

        <p className="hp-hero-sub">Real-time intelligence · 452K+ records tracked daily</p>
      </div>

      <button className="hp-scroll-indicator" onClick={scrollDown} aria-label="Scroll down">
        <ChevronDown size={20} />
      </button>
    </section>
  )
}

// ── Section 1: Live Terminal ────────────────────────────────────────────────
function LiveTerminalSection({ activeHorizon, onHorizonChange }) {
  const [ref, inView] = useInView()
  const [indexData, setIndexData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback((horizon = activeHorizon) => {
    setLoading(true)
    fetchTimeseries(horizon)
      .then(ts => {
        setIndexData({ ...ts, series: interpolateSeries(ts.series) })
        setError(null)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [activeHorizon])

  useEffect(() => { load(activeHorizon) }, [activeHorizon, load])

  const latest = indexData?.series?.slice(-1)[0]

  return (
    <section id="live-terminal" className="hp-section" ref={ref}>
      <div className={`hp-section-container ${inView ? 'hp-anim-in' : ''}`}>
        {/* Section Title Header inside Container Box */}
        <div className="card hp-section-header-box">
          <p className="hp-section-eyebrow">LIVE TERMINAL</p>
          <h2 className="hp-section-title">National Airfare Radar &amp; Telemetry</h2>
          <p className="hp-section-sub">Geometric-mean weighted index across India's top domestic air corridors</p>
        </div>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '14px 20px', borderRadius: 14, marginBottom: 24,
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

        <div className="space-y-6">
          <HorizonControlBar onRefresh={() => load(activeHorizon)} activeHorizon={activeHorizon} onHorizonChange={onHorizonChange} />
          <InterpretationBanner
            indexValue={latest?.index_value ?? 127.4}
            pctChange={latest?.pct_change ?? 4.2}
            yoyChange={8.7}
          />
          <StatCards series={loading ? null : indexData?.series} />
        </div>
      </div>
    </section>
  )
}

// ── Section 2: Route Matrix ─────────────────────────────────────────────────
function RouteMatrixSection({ activeHorizon }) {
  const [ref, inView] = useInView()
  const [filters, setFilters] = useState({ source: 'Bangalore', destination: 'Delhi', cls: 'Economy' })
  const [indexSeries, setIndexSeries] = useState(null)
  const [indexLoading, setIndexLoading] = useState(true)
  const [routeData, setRouteData] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [distribution, setDistribution] = useState(null)

  useEffect(() => {
    setIndexLoading(true)
    fetchTimeseries(activeHorizon)
      .then(ts => setIndexSeries(interpolateSeries(ts.series)))
      .catch(() => {})
      .finally(() => setIndexLoading(false))
  }, [activeHorizon])

  const loadRouteData = useCallback(() => {
    const { source, destination, cls } = filters
    if (!source || !destination) return
    setRouteLoading(true)
    Promise.all([
      fetchRouteTrends(source, destination, cls),
      fetchDistribution(source, destination, cls),
    ])
      .then(([route, dist]) => {
        setRouteData(route)
        setDistribution(dist)
      })
      .catch(console.error)
      .finally(() => setRouteLoading(false))
  }, [filters])

  useEffect(() => { loadRouteData() }, [loadRouteData])

  return (
    <section id="route-matrix" className="hp-section" ref={ref}>
      <div className={`hp-section-container ${inView ? 'hp-anim-in' : ''}`}>
        {/* Section Title Header inside Container Box */}
        <div className="card hp-section-header-box">
          <p className="hp-section-eyebrow">ROUTE MATRIX</p>
          <h2 className="hp-section-title">Route Price Tracker &amp; Price Distribution</h2>
          <p className="hp-section-sub">Filter by origin, destination, and seat class to analyze pricing dynamics</p>
        </div>

        <div className="space-y-6">
          <FilterBar filters={filters} setFilters={setFilters} />
          <IndexChart series={indexSeries} loading={indexLoading} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RouteTrendsChart
              data={routeData} loading={routeLoading}
              source={filters.source} destination={filters.destination}
            />
            <DistributionCard dist={distribution} />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Section 3: Market Overview ──────────────────────────────────────────────
function MarketOverviewSection() {
  const [ref, inView] = useInView()
  const [geography, setGeography] = useState(null)
  const [quality, setQuality] = useState(null)

  useEffect(() => {
    fetchGeography().then(setGeography).catch(() => {})
    fetchQuality().then(setQuality).catch(() => {})
  }, [])

  return (
    <section id="market-overview" className="hp-section" ref={ref}>
      <div className={`hp-section-container ${inView ? 'hp-anim-in' : ''}`}>
        {/* Section Title Header inside Container Box */}
        <div className="card hp-section-header-box">
          <p className="hp-section-eyebrow">MARKET OVERVIEW</p>
          <h2 className="hp-section-title">Geographic &amp; Data Governance Intelligence</h2>
          <p className="hp-section-sub">Regional hierarchies, state-level pricing, and system data quality audits</p>
        </div>

        <div className="space-y-6">
          <GeographicTree geography={geography} />
          <DataQualityCard quality={quality} />
        </div>
      </div>
    </section>
  )
}

// ── Section 4: Carrier Breakdown ────────────────────────────────────────────
function CarrierBreakdownSection() {
  const [ref, inView] = useInView()
  const [filters, setFilters] = useState({ source: 'Bangalore', destination: 'Delhi', cls: 'Economy' })
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
    <section id="carrier-breakdown" className="hp-section" ref={ref}>
      <div className={`hp-section-container ${inView ? 'hp-anim-in' : ''}`}>
        {/* Section Title Header inside Container Box */}
        <div className="card hp-section-header-box">
          <p className="hp-section-eyebrow">CARRIER BREAKDOWN</p>
          <h2 className="hp-section-title">Airline Fare Comparison &amp; Market Share</h2>
          <p className="hp-section-sub">Compare live Economy fares across IndiGo, Air India, SpiceJet, and Akasa Air</p>
        </div>

        <div className="space-y-6">
          <FilterBar filters={filters} setFilters={setFilters} />
          <AirlineChart data={airlineData} loading={loading} />
        </div>
      </div>
    </section>
  )
}

// ── Main Single Page Root ─────────────────────────────────────────────────────
export default function HomePage() {
  const [activeHorizon, setActiveHorizon] = useState('7D')

  return (
    <div className="hp-root">
      <Navbar />
      <HeroSection />
      <LiveTerminalSection activeHorizon={activeHorizon} onHorizonChange={setActiveHorizon} />
      <RouteMatrixSection activeHorizon={activeHorizon} />
      <MarketOverviewSection />
      <CarrierBreakdownSection />

      <footer className="hp-footer">
        <span>NAPI RADAR (SIH26056)</span>
        <span>·</span>
        <span>Official MoSPI / DGCA Statistical Aviation Terminal</span>
        <span>·</span>
        <span>© 2026 AIRTREND</span>
      </footer>
    </div>
  )
}
