import type { DriftSummary } from './types'

const DRIFT_KEYS = ['sleep_hours', 'mood', 'energy', 'stress'] as const
type DriftKey = typeof DRIFT_KEYS[number]

function avg(values: Array<number | null | undefined>) {
  const nums = values.filter((v): v is number => typeof v === 'number')
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function computeDeltas(rowsLast7: any[], rowsPrev7: any[]): Record<string, number> {
  const deltas: Record<string, number> = {}
  for (const key of DRIFT_KEYS) {
    const a = avg(rowsLast7.map(r => r[key]))
    const b = avg(rowsPrev7.map(r => r[key]))
    if (a == null || b == null) continue
    deltas[key] = Number((a - b).toFixed(3))
  }
  return deltas
}

export function pickPrimaryMetric(deltas: Record<string, number>): string | undefined {
  const entries = Object.entries(deltas)
  if (!entries.length) return undefined
  entries.sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))
  return entries[0][0]
}

export function makeDriftSummary(params: {
  deltas: Record<string, number>
  windowStart: string
  windowEnd: string
}): DriftSummary {
  return {
    primaryMetric: pickPrimaryMetric(params.deltas),
    deltas: params.deltas,
    window: { start: params.windowStart, end: params.windowEnd }
  }
}