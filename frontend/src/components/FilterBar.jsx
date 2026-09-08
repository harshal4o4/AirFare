// src/components/FilterBar.jsx
import { useEffect, useState } from 'react'
import { SlidersHorizontal, RotateCcw } from 'lucide-react'
import { fetchFilters } from '../api'

const DEFAULT = { source: 'Delhi', destination: 'Mumbai', cls: 'Economy' }

export default function FilterBar({ filters, setFilters }) {
  const [meta, setMeta]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFilters()
      .then(setMeta)
      .catch(() => setMeta(null))
      .finally(() => setLoading(false))
  }, [])

  const update = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))
  const reset  = () => setFilters(DEFAULT)

  if (loading) {
    return (
      <div className="card p-4 flex gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-10 w-36 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 mr-2">
          <SlidersHorizontal size={15} style={{ color: 'var(--accent-blue)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Filters
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider"
                 style={{ color: 'var(--text-muted)' }}>Origin</label>
          <select
            className="select-custom w-36"
            value={filters.source}
            onChange={e => update('source', e.target.value)}
          >
            {meta?.sources?.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex items-end pb-1 text-xs" style={{ color: 'var(--text-muted)' }}>→</div>

        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider"
                 style={{ color: 'var(--text-muted)' }}>Destination</label>
          <select
            className="select-custom w-36"
            value={filters.destination}
            onChange={e => update('destination', e.target.value)}
          >
            {meta?.destinations
              ?.filter(d => d !== filters.source)
              .map(d => <option key={d}>{d}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider"
                 style={{ color: 'var(--text-muted)' }}>Class</label>
          <select
            className="select-custom w-40"
            value={filters.cls}
            onChange={e => update('cls', e.target.value)}
          >
            <option value="">All Classes</option>
            {meta?.classes?.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="ml-auto flex items-end pb-0">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={{
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.2)',
              color: '#818cf8'
            }}
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>

        {meta && (
          <div className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            {meta.date_range.from} → {meta.date_range.to}
          </div>
        )}
      </div>
    </div>
  )
}
