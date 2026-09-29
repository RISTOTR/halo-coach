import { defineEventHandler, getQuery, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const qSchema = z.object({
  windowDays: z.coerce.number().int().min(7).max(180).optional(),
  minN: z.coerce.number().int().min(3).max(30).optional(),
})

const confRank: Record<string, number> = { learning: 0, moderate: 1, strong: 2 }

// small noise cutoffs (early-data friendly)
const minAbsDiffByLever: Record<string, number> = {
  sleep_hours: 0.05,
  steps: 2, // Movement minutes
  outdoor_minutes: 2,
  water_liters: 0.05,
  habits_rate: 0.03,
  habits_all_done: 0.08,

  // hide these for now (they’re less useful than habits_rate)
  habits_done: 999,
  habits_total: 999,
}

function leverSuggestion(lever: string, diff: number) {
  if (diff <= 0) return null

  if (lever === 'sleep_hours') {
    return 'Prioritize sleep consistency this week.'
  }

  if (lever === 'steps') {
    return 'Try increasing daily movement.'
  }

  if (lever === 'habits_rate') {
    return 'Keep your habits streak going.'
  }

  if (lever === 'outdoor_minutes') {
    return 'Try getting a bit more outdoor time.'
  }

  if (lever === 'water_liters') {
    return 'Hydration may be worth keeping consistent.'
  }

  if (lever === 'habits_all_done') {
    return 'Aim to complete all planned habits more often.'
  }

  return null
}

function isActionableLever(lever: string) {
  return [
    'sleep_hours',
    'steps',
    'habits_rate',
    'outdoor_minutes',
    'water_liters',
    'habits_all_done',
  ].includes(lever)
}

function scoreRow(r: any) {
  // Prefer standardized effect for numeric where available
  const d = r.cohen_d == null ? null : Number(r.cohen_d)
  if (r.lever_type === 'numeric' && d != null) return Math.abs(d)
  return Math.abs(Number(r.diff))
}

export default defineEventHandler(async (event) => {
  const query = qSchema.parse(getQuery(event))
  const windowDays = query.windowDays ?? 30
  const minN = query.minN ?? 4 // ✅ was 7

  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase.rpc('get_what_works', {
    p_window_days: windowDays,
    p_min_n: minN,
  })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = (data ?? [])

  // Filter tiny/noisy diffs and hidden levers
  const filtered = rows.filter((r: any) => {
    const lever = String(r.lever)
    const diff = Number(r.diff)
    const minAbs = minAbsDiffByLever[lever]
    if (minAbs == null) return true
    return Math.abs(diff) >= minAbs
  })

  // Sort by effect strength, then by confidence
  const top = filtered
    .sort((a: any, b: any) => {
      const sa = scoreRow(a)
      const sb = scoreRow(b)
      if (sb !== sa) return sb - sa
      return confRank[b.confidence] - confRank[a.confidence]
    })
    .slice(0, 3)

  const bestPositiveSignal = top.find((r: any) =>
    Number(r.diff) > 0 && isActionableLever(String(r.lever))
  )

  const suggestion = bestPositiveSignal
    ? leverSuggestion(String(bestPositiveSignal.lever), Number(bestPositiveSignal.diff))
    : null

  const overallConfidence =
    top.reduce((best: string, r: any) => (confRank[r.confidence] > confRank[best] ? r.confidence : best), 'learning')

  const suggestionMap: Record<string, string> = {
  sleep_hours: 'Prioritize consistent sleep this week.',
  steps: 'Try increasing daily movement.',
  habits_rate: 'Keep your habits streak going.',
  outdoor_minutes: 'More outdoor time might help your mood.',
  water_liters: 'Hydration seems beneficial.',
}


  return {
    windowDays,
    minN,
    overallConfidence,
    suggestion,
    signals: top.map((r: any) => ({
      lever: String(r.lever),
      leverType: r.lever_type as 'numeric' | 'boolean',
      diff: Number(r.diff),
      avgGood: Number(r.avg_good),
      avgBase: Number(r.avg_base),
      cohenD: r.cohen_d == null ? null : Number(r.cohen_d),
      confidence: r.confidence as 'learning' | 'moderate' | 'strong',
    })),
  }
})