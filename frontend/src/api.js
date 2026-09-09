// src/api.js — centralised fetch helpers
const BASE = '/api/v1'

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export const fetchFilters      = ()                             => get('/filters')
export const fetchTimeseries   = (timeRange)                    => get(`/index/timeseries${timeRange ? `?range=${timeRange}` : ''}`)
export const fetchRouteTrends  = (src, dst, cls)               => get(`/routes/trends?source=${src}&destination=${dst}${cls ? `&class=${cls}` : ''}`)
export const fetchAirlines     = (src, dst, cls)               => get(`/airlines/comparison?source=${src}&destination=${dst}${cls ? `&class=${cls}` : ''}`)
export const fetchLeadtime     = (src, dst, cls)               => get(`/index/leadtime?source=${src}&destination=${dst}${cls ? `&class=${cls}` : ''}`)
export const fetchDistribution = (src, dst, cls)               => get(`/distribution?${src ? `source=${src}&` : ''}${dst ? `destination=${dst}&` : ''}${cls ? `class=${cls}` : ''}`)
export const fetchQuality      = ()                             => get('/quality')
export const fetchGeography    = ()                             => get('/geography')
export const fetchRouteSummary = ()                             => get('/routes/summary')
