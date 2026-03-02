import type { LeverPattern } from './types'

function confW(c: string) {
  if (c === 'high') return 1.0
  if (c === 'medium') return 0.7
  return 0.4
}

// For stress: negative delta is good; for others: positive delta is good
function directionGood(metricKey: string, avgDelta: number) {
  if (metricKey === 'stress') return avgDelta < 0
  return avgDelta > 0
}

export function patternPrior(params: {
  patterns: LeverPattern[]
  groupBy: 'lever_type' | 'lever_ref'
  groupValue?: string // lever_ref or lever_type of the candidate option
  targetMetric: string
}) {
  if (!params.groupValue) return 1.0

  // Prefer patterns where metricKey == targetMetric (direct effect)
  const direct = params.patterns.filter(p =>
    p.groupBy === params.groupBy &&
    p.group === params.groupValue &&
    p.targetMetric === params.targetMetric &&
    p.metricKey === params.targetMetric
  )

  // fallback to any metricKey within same targetMetric (less strong)
  const any = params.patterns.filter(p =>
    p.groupBy === params.groupBy &&
    p.group === params.groupValue &&
    p.targetMetric === params.targetMetric
  )

  const best = (direct.length ? direct : any)
    .sort((a, b) => (b.n - a.n) || (Math.abs(b.avgDelta) - Math.abs(a.avgDelta)))[0]

  if (!best) return 1.0

  const good = directionGood(best.metricKey, best.avgDelta)
  const strength = Math.min(0.25, 0.05 + (best.n * 0.02)) // capped deterministic boost
  const w = confW(best.confidence)

  // If good: boost up to ~1.25 ; if bad: penalize down to ~0.8
  return good ? (1.0 + strength * w) : (1.0 - strength * w)
}