import type { GateResult, NextFocusOption } from '~/server/lib/ai/types'

function confText(c: string) {
  if (c === 'high') return 'High'
  if (c === 'medium') return 'Medium'
  return 'Low'
}

export function formatOptionUI(params: {
  option: NextFocusOption
  gate: GateResult
}) {
  const { option, gate } = params

  const nExp = option.evidence?.experimentRows ?? 0
  const nCorr = option.evidence?.corrN ?? 0

  if (gate.mode === 'claim') {
    return {
      badge: 'Likely for you' as const,
      subtitle: `Based on your data (experiments ≥ ${gate.thresholds.minExperimentRows}, corr n ≥ ${gate.thresholds.minCorrN}).`,
      disclaimer: undefined
    }
  }

  // Explore mode copy
  const reasons = gate.reasons
  const bits: string[] = []

  if (reasons.includes('insufficient_experiment_rows')) bits.push(`experiments=${nExp}`)
  if (reasons.includes('insufficient_correlation_n')) bits.push(`corr n=${nCorr}`)

  const detail = bits.length ? ` (${bits.join(', ')})` : ''

  return {
    badge: 'Idea' as const,
    subtitle: `Exploration suggestion${detail}.`,
    disclaimer: `Treat this as a hypothesis — run it for ~7 days to learn what works for you.`
  }
}