export type InsightMode = 'explore' | 'claim'
export type ConfidenceLabel = 'low' | 'medium' | 'high'

export type GateResult = {
  mode: InsightMode
  canClaim: boolean
  label: ConfidenceLabel
  reasons: string[]
  thresholds: { minExperimentRows: number; minCorrN: number }
}

export type DriftSummary = {
  primaryMetric?: string
  deltas: Record<string, number>
  window: { start: string; end: string }
}

export type NextFocusOption = {
  id: string
  title: string
  targetMetric: string
  leverType: 'metric' | 'habit' | 'custom'
  leverRef?: string
  why: string[]
  score: number
  confidence: ConfidenceLabel
  mode: InsightMode
  evidence?: {
    corrN?: number
    experimentRows?: number
    driftDelta?: number
    noveltyPenalty?: number
  }
  suggestedPlan?: { durationDays: number; effort: 'low' | 'moderate' | 'high' }
}

export type WeeklyInsight = {
  weekKey: string
  windowStart: string
  windowEnd: string
  drift: DriftSummary
  gate: GateResult
  nextFocusOptions: NextFocusOption[]
  computedAt: string
}

export type LeverPattern = {
  groupBy: 'lever_type' | 'lever_ref'
  group: string
  targetMetric: string
  metricKey: string
  n: number
  avgDelta: number
  improvedRate: number
  confidence: 'low' | 'medium' | 'high'
}