import type { ConfidenceLabel, NextFocusOption } from './types'

function confidenceWeight(label: ConfidenceLabel) {
  if (label === 'high') return 1
  if (label === 'medium') return 0.8
  return 0.6
}

function impactWeight(expectedImpact?: string) {
  if (!expectedImpact) return 0.9
  const v = expectedImpact.toLowerCase()
  if (v === 'high') return 1.2
  if (v === 'moderate' || v === 'medium') return 1.0
  if (v === 'low') return 0.85
  return 0.9
}

function driftWeight(targetMetric: string, primaryDriftMetric?: string) {
  return targetMetric === primaryDriftMetric ? 1.2 : 1.0
}

export function scoreAndSort(params: {
  options: Array<NextFocusOption & { _expectedImpact?: string }>
  primaryDriftMetric?: string
}) {
  return params.options
    .map(o => {
      const noveltyPenaltyValue = o.evidence?.noveltyPenalty ?? 0
      const patternPriorValue = o.evidence?.patternPrior ?? 1

      const impactW = impactWeight(o._expectedImpact)
      const confidenceW = confidenceWeight(o.confidence)
      const driftW = driftWeight(o.targetMetric, params.primaryDriftMetric)
      const noveltyW = 1 - noveltyPenaltyValue
      const patternW = patternPriorValue

      const score =
        impactW *
        confidenceW *
        noveltyW *
        driftW *
        patternW

      return {
        ...o,
        score: Number(score.toFixed(4)),
        evidence: {
          ...(o.evidence ?? {}),
          breakdown: {
            impact: Number(impactW.toFixed(3)),
            confidence: Number(confidenceW.toFixed(3)),
            novelty: Number(noveltyW.toFixed(3)),
            drift: Number(driftW.toFixed(3)),
            pattern: Number(patternW.toFixed(3))
          }
        }
      }
    })
    .sort((a, b) => b.score - a.score)
}