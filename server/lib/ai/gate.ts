import type { GateResult } from './types'

const MIN_EXPERIMENT_ROWS = 4
const MIN_CORR_N = 14

export function gate(params: { experimentRows: number; corrN: number }): GateResult {
  const reasons: string[] = []
  if (params.experimentRows < MIN_EXPERIMENT_ROWS) reasons.push('insufficient_experiment_rows')
  if (params.corrN < MIN_CORR_N) reasons.push('insufficient_correlation_n')

  const canClaim = reasons.length === 0
  return {
    mode: canClaim ? 'claim' : 'explore',
    canClaim,
    label: canClaim ? 'high' : 'low',
    reasons,
    thresholds: { minExperimentRows: MIN_EXPERIMENT_ROWS, minCorrN: MIN_CORR_N }
  }
}