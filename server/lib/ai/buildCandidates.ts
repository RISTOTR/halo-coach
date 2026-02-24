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

  // deterministic ordering: filter → map
  return presets.map((p): NextFocusOption & { _expectedImpact?: string } => {
    const driftDelta = deltas[p.targetMetric]
    const nov = noveltyPenalty(daysSinceLeverRef(p.leverRef))

    // “why” should be structured + deterministic
    const why: string[] = []
    if (primaryDrift && p.targetMetric === primaryDrift) {
      why.push(`Your ${primaryDrift} drifted recently → prioritize it.`)
    }
    if (typeof driftDelta === 'number') {
      why.push(`Weekly delta for ${p.targetMetric}: ${driftDelta > 0 ? '+' : ''}${driftDelta}`)
    }
    why.push(gate.mode === 'claim'
      ? 'Enough data for stronger claims.'
      : 'Exploration mode (data still sparse).'
    )

    return {
      id: `${weekKey}:${p.targetMetric}:${p.leverRef ?? p.title}`,
      title: p.title,
      targetMetric: p.targetMetric,
      leverType: p.leverType,
      leverRef: p.leverRef,
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