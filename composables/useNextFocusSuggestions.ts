import { useRequestHeaders } from '#app'

type Effort = 'low' | 'moderate' | 'high'
type Impact = 'low' | 'moderate' | 'high'
type TargetMetric =
  | 'energy' | 'stress' | 'mood'
  | 'sleep_hours' | 'steps' | 'water_liters' | 'outdoor_minutes'

type Preset = {
  title: string
  leverType: 'metric' | 'habit' | 'custom'
  leverRef?: string
  targetMetric: TargetMetric
  effortEstimate?: Effort
  expectedImpact?: Impact
  recommendedDays?: number
  baselineDays?: number
}

export type NextFocusOption = {
  id: string
  title: string
  why: string[]
  effort: Effort
  impact: Impact
  mode: 'explore' | 'claim'
  confidence: 'low' | 'medium' | 'high'
  preset: Preset | null
}

function metricLabel(k: string) {
  const map: Record<string, string> = {
    sleep_hours: 'sleep',
    mood: 'mood',
    energy: 'energy',
    stress: 'stress',
    steps: 'steps',
    water_liters: 'water',
    outdoor_minutes: 'outdoor time'
  }
  return map[k] ?? k
}

function buildPresetFromMetric(x: string): Preset {
  if (x === 'sleep_hours') {
    return { title: 'Sleep consistency (same bedtime)', leverType: 'habit', leverRef: 'sleep_consistency', targetMetric: 'sleep_hours', effortEstimate: 'low', expectedImpact: 'moderate', recommendedDays: 7, baselineDays: 30 }
  }
  if (x === 'water_liters') {
    return { title: 'Hydration (2L baseline)', leverType: 'habit', leverRef: 'hydration_2l', targetMetric: 'water_liters', effortEstimate: 'low', expectedImpact: 'moderate', recommendedDays: 7, baselineDays: 30 }
  }
  if (x === 'outdoor_minutes') {
    return { title: 'Outdoor walk (15–20 min)', leverType: 'habit', leverRef: 'outdoor_walk_20m', targetMetric: 'outdoor_minutes', effortEstimate: 'low', expectedImpact: 'moderate', recommendedDays: 7, baselineDays: 30 }
  }
  return { title: 'Evening walk', leverType: 'habit', leverRef: 'evening_walk', targetMetric: 'outdoor_minutes', effortEstimate: 'low', expectedImpact: 'moderate', recommendedDays: 7, baselineDays: 30 }
}

function noveltyPenaltyDays(daysSince: number | null) {
  if (daysSince == null) return 0
  if (daysSince <= 14) return 0.35
  if (daysSince <= 30) return 0.2
  if (daysSince <= 60) return 0.1
  return 0
}

export function useNextFocusSuggestions() {
  async function loadNextFocus(params?: { windowDays?: number }) {
    const windowDays = params?.windowDays ?? 60
    const headers = process.server ? useRequestHeaders(['cookie']) : undefined

    const corrRes = await $fetch('/api/ai/insights/correlations', {
      query: { windowDays, minN: 14 }, // ✅ align with claim gating rule
      credentials: 'include',
      headers
    }) as any

    const recent = await $fetch('/api/ai/insights/recent-levers', {
      query: { days: 60 },
      credentials: 'include',
      headers
    }) as any

    const lastUseByLeverRef: Record<string, string> = recent?.lastUseByLeverRef ?? {}

    function daysSince(lastDate?: string) {
      if (!lastDate) return null
      const now = new Date()
      const a = new Date(now.toISOString().slice(0, 10) + 'T00:00:00Z').getTime()
      const b = new Date(lastDate + 'T00:00:00Z').getTime()
      return Math.floor((a - b) / 86400000)
    }

    const corrs = Array.isArray(corrRes?.items) ? corrRes.items : []

    const top = corrs
      .filter((c: any) => typeof c?.corr === 'number' && Number.isFinite(c.corr))
      .sort((a: any, b: any) => Math.abs(b.corr) - Math.abs(a.corr))[0]

    const options: NextFocusOption[] = []

    if (top) {
      const x = String(top.x)
      const y = String(top.y)
      const corr = Number(top.corr)
      const n = Number(top.n ?? 0)

      const canClaim = n >= 14
      const mode = canClaim ? 'claim' : 'explore'
      const confidence = canClaim ? 'medium' : 'low'

      const relation = corr >= 0 ? 'moves with' : 'moves opposite to'
      const why = [
        `Last ${windowDays} days: ${metricLabel(x)} ${relation} ${metricLabel(y)} (r=${corr.toFixed(2)}, n=${n}).`,
        canClaim
          ? `This is a decent signal. Try nudging ${metricLabel(x)} to see if ${metricLabel(y)} follows.`
          : `This is exploratory (limited samples). Try a small nudge and watch what happens.`
      ]

      let preset = buildPresetFromMetric(x)

      // novelty: if used recently, fall back to a different leverRef
      const last = preset.leverRef ? lastUseByLeverRef[preset.leverRef] : undefined
      const pen = noveltyPenaltyDays(daysSince(last))
      if (pen >= 0.2) {
        // fallback that’s different from the chosen leverRef
        preset = { title: 'Daily decompression (10 min)', leverType: 'habit', leverRef: 'decompression_10m', targetMetric: 'stress', effortEstimate: 'moderate', expectedImpact: 'high', recommendedDays: 7, baselineDays: 30 }
        why.push(`You used “${preset.leverRef}” recently — switching to a fresher lever to avoid repetition.`)
      }

      options.push({
        id: 'A',
        title: `Small nudge: improve ${metricLabel(x)}`,
        why,
        effort: 'low',
        impact: 'moderate',
        mode,
        confidence,
        preset
      })
    }

    options.push({
      id: 'B',
      title: 'Higher impact: reduce stress (7 days)',
      why: [
        'Run a structured stress-focused experiment for one week.',
        'This yields enough data to strengthen “what works for you” patterns.'
      ],
      effort: 'moderate',
      impact: 'high',
      mode: 'explore',
      confidence: 'low',
      preset: {
        title: 'Daily decompression (10 min)',
        leverType: 'habit',
        leverRef: 'decompression_10m',
        targetMetric: 'stress',
        effortEstimate: 'moderate',
        expectedImpact: 'high',
        recommendedDays: 7,
        baselineDays: 30
      }
    })

    return { options: options.slice(0, 2), debug: { topCorrelation: top, windowDays } }
  }

  return { loadNextFocus }
}