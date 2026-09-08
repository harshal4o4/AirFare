// src/components/Navbar.jsx
import { Plane, Activity } from 'lucide-react'

export default function Navbar() {
  return (
    <header className="glass sticky top-0 z-50 px-6 py-4">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
            <Plane size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight tracking-tight">
              National Airfare Price Index
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Real-time domestic fare analytics · India
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
             style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400">Live · 452K records</span>
        </div>
      </div>
    </header>
  )
}
