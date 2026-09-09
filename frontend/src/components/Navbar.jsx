// src/components/Navbar.jsx
import { Plane, ShieldCheck } from 'lucide-react'

export default function Navbar() {
  return (
    <header className="glass sticky top-0 z-50 px-6 py-3.5">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center glow-cyan"
               style={{ background: 'linear-gradient(135deg, #06b6d4, #6366f1)' }}>
            <Plane size={18} className="text-slate-950 font-bold" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight tracking-tight font-heading flex items-center gap-2">
              National Airfare Price Index
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                AeroMetric v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              MoSPI / DGCA Statistical Aviation Terminal · India
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono">
            <ShieldCheck size={13} className="text-cyan-400" />
            <span>Official DGCA Basket (2024 Base)</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-semibold text-emerald-400">Live · 452K Records</span>
          </div>
        </div>
      </div>
    </header>
  )
}
