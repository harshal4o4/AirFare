// src/pages/StubPage.jsx — Light SaaS Theme
import { Wrench } from 'lucide-react'

export default function StubPage({ title, description }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', textAlign: 'center', gap: 24,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: '#f4f4f6', border: '1px solid rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Wrench size={26} style={{ color: '#8a8a8f' }} />
      </div>

      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111111', marginBottom: 10, letterSpacing: '-0.03em' }}>
          {title}
        </h2>
        <p style={{ fontSize: 14, color: '#8a8a8f', maxWidth: 380, lineHeight: 1.65 }}>
          {description ?? 'This terminal is currently under construction and will be available in the next release.'}
        </p>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 20px', borderRadius: 99,
        background: '#ffffff', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff6a1a' }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#8a8a8f', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          TERMINAL CALIBRATING — SIH26056 v5.0
        </span>
      </div>
    </div>
  )
}
