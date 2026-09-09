// src/components/FilterBar.jsx — Light SaaS Theme
import { useEffect, useState } from 'react'
import { SlidersHorizontal, RotateCcw } from 'lucide-react'
import { fetchFilters } from '../api'

const DEFAULT = { source: 'Delhi', destination: 'Mumbai', cls: 'Economy' }

export default function FilterBar({ filters, setFilters }) {
  const [meta, setMeta]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFilters()
      .then(setMeta)
      .catch(() => setMeta(null))
      .finally(() => setLoading(false))
  }, [])

  const update = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))
  const reset  = () => setFilters(DEFAULT)

  if (loading) return (
    <div className="card" style={{ padding: '16px 20px !important', display: 'flex', gap: 12 }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 40, width: 140, borderRadius: 12 }} />
      ))}
    </div>
  )

  return (
    <div className="card" style={{ padding: '16px 20px !important' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        {/* Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginRight: 4 }}>
          <SlidersHorizontal size={14} style={{ color: '#8a8a8f' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111111' }}>Filters</span>
        </div>

        {/* Origin */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#8a8a8f' }}>
            Origin
          </label>
          <select className="select-custom" style={{ width: 148 }} value={filters.source}
            onChange={e => update('source', e.target.value)}>
            {meta?.sources?.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <span style={{ color: '#c0c0c6', fontSize: 18, lineHeight: 1, paddingBottom: 2 }}>→</span>

        {/* Destination */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#8a8a8f' }}>
            Destination
          </label>
          <select className="select-custom" style={{ width: 148 }} value={filters.destination}
            onChange={e => update('destination', e.target.value)}>
            {meta?.destinations?.filter(d => d !== filters.source).map(d => <option key={d}>{d}</option>)}
          </select>
        </div>

        {/* Class */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#8a8a8f' }}>
            Class
          </label>
          <select className="select-custom" style={{ width: 158 }} value={filters.cls}
            onChange={e => update('cls', e.target.value)}>
            <option value="">All Classes</option>
            {meta?.classes?.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Reset */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end', paddingBottom: 0 }}>
          <button onClick={reset} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.10)',
            background: '#f8f8fa', color: '#8a8a8f', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f0f0f2'; e.currentTarget.style.color = '#111111' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f8f8fa'; e.currentTarget.style.color = '#8a8a8f' }}>
            <RotateCcw size={12} /> Reset
          </button>
        </div>

        {meta && (
          <span style={{ fontSize: 12, color: '#8a8a8f' }}>
            {meta.date_range.from} → {meta.date_range.to}
          </span>
        )}
      </div>
    </div>
  )
}
