import type { GateResult, NextFocusOption } from '~/server/lib/ai/types'
import { noveltyPenalty } from '~/server/lib/ai/novelty'

type Effort = 'low' | 'moderate' | 'high'
type Impact = 'low' | 'moderate' | 'high'
type TargetMetric =
  | 'energy' | 'stress' | 'mood'
  | 'sleep_hours' | 'steps' | 'water_liters' | 'outdoor_minutes'

export type Preset = {
  title: string
  leverType: 'metric' | 'habit' | 'custom'
  leverRef?: string
  targetMetric: TargetMetric
  effortEstimate?: Effort
  expectedImpact?: Impact
  recommendedDays?: number
  baselineDays?: number
}

export function buildCandidates(params: {
  weekKey: string
  presets: Preset[]
  preset?: Preset
  gate: GateResult
  deltas: Record<string, number>
  primaryDrift?: string
  daysSinceLeverRef: (leverRef?: string) => number | null
  corrNMax: number
  experimentRowsMax: number
}) {
  const {
    weekKey, presets, gate, deltas, primaryDrift,
    daysSinceLeverRef, corrNMax, experimentRowsMax
  } = params

  return presets.map((p): NextFocusOption & { _expectedImpact?: Impact } => {
    const driftDelta = deltas[p.targetMetric]
    const nov = noveltyPenalty(daysSinceLeverRef(p.leverRef))

    const why: string[] = []

    // Drift wiring (deterministic)
    if (primaryDrift && p.targetMetric === primaryDrift) {
      why.push(`Primary drift is ${primaryDrift} → prioritize it this week.`)
    }
    if (typeof driftDelta === 'number') {
      why.push(`Delta (${p.targetMetric}) over last 7d vs prev 7d: ${driftDelta > 0 ? '+' : ''}${driftDelta}`)
    }

    // Gating copy (consistent everywhere)
    why.push(
      gate.mode === 'claim'
        ? 'Enough data for stronger claims.'
        : 'Exploration mode: treat this as an idea, not a claim.'
    )

    // Novelty explanation if penalized (optional)
    if (nov >= 0.2 && p.leverRef) {
      why.push(`You used ${p.leverRef} recently → novelty penalty applied.`)
    }

    return {
      id: `${weekKey}:${p.targetMetric}:${p.leverRef ?? p.title}`,
      title: p.title,
      targetMetric: p.targetMetric,
      leverType: p.leverType,
      leverRef: p.leverRef,
      preset: p,
      why,
      score: 0,
      confidence: gate.label,
      mode: gate.mode,
      evidence: {
        corrN: corrNMax,
        experimentRows: experimentRowsMax,
        driftDelta,
        noveltyPenalty: nov
      },
      suggestedPlan: {
        durationDays: p.recommendedDays ?? 7,
        effort: p.effortEstimate ?? 'low'
      },
      _expectedImpact: p.expectedImpact
    }
  })
}