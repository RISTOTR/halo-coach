import type { LeverPattern } from '~/server/lib/ai/types'

function confW(c: string) {
  if (c === 'high') return 1.0
  if (c === 'medium') return 0.7
  return 0.4
}

// Stress: negative delta is good. Others: positive delta is good.
function goodDirection(metricKey: string, avgDelta: number) {
  if (metricKey === 'stress') return avgDelta < 0
  return avgDelta > 0
}

export function patternPrior(params: {
  patterns: LeverPattern[]
  groupBy: 'lever_ref' | 'lever_type'
  groupValue?: string
  targetMetric: string
}) {
  const { patterns, groupBy, groupValue, targetMetric } = params
  if (!groupValue) return 1.0

  // Prefer direct effects where metricKey matches targetMetric
  const direct = patterns.filter(p =>
    p.groupBy === groupBy &&
    p.group === groupValue &&
    p.targetMetric === targetMetric &&
    p.metricKey === targetMetric
  )

  const pool = direct.length ? direct : patterns.filter(p =>
    p.groupBy === groupBy &&
    p.group === groupValue &&
    p.targetMetric === targetMetric
  )

  const best = pool.sort((a, b) => (b.n - a.n) || (Math.abs(b.avgDelta) - Math.abs(a.avgDelta)))[0]
  if (!best) return 1.0

  const good = goodDirection(best.metricKey, best.avgDelta)

  // deterministic capped effect
  const strength = Math.min(0.25, 0.05 + best.n * 0.02)
  const w = confW(best.confidence)

  return good ? (1 + strength * w) : (1 - strength * w)
}