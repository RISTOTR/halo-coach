export type InsightMode = 'explore' | 'claim'
export type ConfidenceLabel = 'low' | 'medium' | 'high'

export type Preset = {
  title: string
  leverType: 'metric' | 'habit' | 'custom'
  leverRef?: string
  targetMetric: string
  effortEstimate?: 'low' | 'moderate' | 'high'
  expectedImpact?: 'low' | 'moderate' | 'high'
  recommendedDays?: number
  baselineDays?: number
}

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
  preset?: Preset
  why: string[]
  score: number
  confidence: ConfidenceLabel
  mode: InsightMode
  evidence?: {
    corrN?: number
    experimentRows?: number
    driftDelta?: number
    noveltyPenalty?: number
    patternPrior?: number

    breakdown?: {
      impact: number
      confidence: number
      novelty: number
      drift: number
      pattern: number
    }
  }
  ui?: {
    badge: 'Idea' | 'Likely for you'
    subtitle: string
    disclaimer?: string
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