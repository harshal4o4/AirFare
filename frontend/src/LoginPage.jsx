// src/LoginPage.jsx
import { useState, useRef, useEffect } from 'react'

export default function LoginPage({ onLogin }) {
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const nameRef = useRef(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  function validate() {
    const errs = {}
    if (!name.trim()) errs.name = 'Name is required'
    else if (name.trim().length < 2) errs.name = 'Enter at least 2 characters'

    const cleanMobile = mobile.replace(/\s|-/g, '')
    if (!cleanMobile) errs.mobile = 'Mobile number is required'
    else if (!/^[6-9]\d{9}$/.test(cleanMobile)) errs.mobile = 'Enter a valid 10-digit Indian mobile'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setTimeout(() => {
      onLogin({ name: name.trim(), mobile: mobile.replace(/\s|-/g, '') })
    }, 900)
  }

  return (
    <div className="login-page">
      {/* Full-bleed background image */}
      <img
        src="/aviation-bg.jpg"
        alt=""
        className="login-bg-img"
        draggable="false"
      />

      {/* Gradient overlays for readability */}
      <div className="login-overlay-left" />
      <div className="login-overlay-bottom" />

      {/* ── LEFT: Glass login card ── */}
      <div className={`login-glass-card ${submitting ? 'login-card-exit' : ''}`}>
        {/* Simple heading */}
        <h2 className="login-card-title">Sign In</h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
          {/* Name */}
          <div className={`login-field ${focusedField === 'name' ? 'login-field-focus' : ''} ${errors.name ? 'login-field-error' : ''}`}>
            <label htmlFor="login-name" className="login-label">YOUR NAME</label>
            <input
              ref={nameRef}
              id="login-name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={e => setName(e.target.value)}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              className="login-input"
            />
            {errors.name && <span className="login-error">{errors.name}</span>}
          </div>

          {/* Mobile */}
          <div className={`login-field ${focusedField === 'mobile' ? 'login-field-focus' : ''} ${errors.mobile ? 'login-field-error' : ''}`}>
            <label htmlFor="login-mobile" className="login-label">MOBILE NUMBER</label>
            <div className="login-mobile-wrap">
              <span className="login-country-code">+91</span>
              <input
                id="login-mobile"
                type="tel"
                inputMode="numeric"
                placeholder="98765 43210"
                value={mobile}
                onChange={e => setMobile(e.target.value.replace(/[^0-9\s-]/g, '').slice(0, 12))}
                onFocus={() => setFocusedField('mobile')}
                onBlur={() => setFocusedField(null)}
                className="login-input login-input-mobile"
              />
            </div>
            {errors.mobile && <span className="login-error">{errors.mobile}</span>}
          </div>

          {/* Submit */}
          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? (
              <>
                <span className="login-spinner" />
                SIGNING IN…
              </>
            ) : (
              'SIGN IN'
            )}
          </button>
        </form>
      </div>

      {/* ── RIGHT: Brand & Tagline ── */}
      <div className="login-hero-text">
        <div className="login-right-brand">
          <span>AIRTREND</span>
        </div>
        <p className="login-right-tagline">
          Real-time airfare intelligence for India's skies
        </p>
      </div>

      {/* Bottom bar */}
      <div className="login-bottom-bar">
        <span>NAPI RADAR (SIH26056)</span>
        <span>·</span>
        <span>© 2026 AIRTREND</span>
      </div>
    </div>
  )
}
