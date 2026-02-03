// server/api/next-focus.get.ts
import { defineEventHandler, getQuery, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const querySchema = z.object({
  date: z.string().optional() // YYYY-MM-DD (defaults today)
})

type MetricKey = 'sleep_hours' | 'mood' | 'stress' | 'energy'

type Effort = 'low' | 'moderate' | 'high'
type Impact = 'low' | 'moderate' | 'high'

type NextFocusOption = {
  id: 'sleep' | 'outdoor' | 'hydration' | 'movement' | 'stress_downshift'
  title: string
  why: string
  effort: Effort
  impact: Impact
  preset: { 
  title: 'Sleep consistency',
  leverType: 'metric',
  leverRef: 'sleep_hours',
  targetMetric: 'energy',
  effortEstimate: 'low',
  expectedImpact: 'high',
  recommendedDays: 7,
  baselineDays: 30
}
  score: number // internal
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function pickTop2(opts: NextFocusOption[]) {
  const sorted = [...opts].sort((a, b) => b.score - a.score)

  // Option A = lowest effort among top candidates
  const effortRank: Record<Effort, number> = { low: 0, moderate: 1, high: 2 }

  const best = sorted[0]
  if (!best) return []

  // Choose A from the top ~4 to keep it relevant, then choose B as best overall not equal to A
  const topPool = sorted.slice(0, 4)
  const optionA = topPool.sort((a, b) => effortRank[a.effort] - effortRank[b.effort])[0] || best

  const optionB = sorted.find((o) => o.id !== optionA.id) || null

  const out = [optionA]
  if (optionB) out.push(optionB)

  // Remove internal score before returning
  return out.map(({ score, ...rest }) => rest)
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = await serverSupabaseClient(event)
  const { date } = querySchema.parse(getQuery(event))

  const today = isoDate(date ? new Date(date) : new Date())

  // Pull last 7d overview (you already have this endpoint shape)
  // We call it internally by querying the same tables directly (avoid HTTP self-call).
  // If you prefer, we can refactor later to reuse a shared util.
  const start7 = (() => {
    const d = new Date(`${today}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - 6)
    return isoDate(d)
  })()

  // ---- Metrics (last 7 days) ----
  const { data: metricsRows, error: metricsErr } = await supabase
    .from('daily_metrics')
    .select('date,sleep_hours,mood,stress,energy,water_liters,steps,outdoor_minutes')
    .eq('user_id', uid)
    .gte('date', start7)
    .lte('date', today)
    .order('date', { ascending: true })

  if (metricsErr) throw createError({ statusCode: 500, statusMessage: metricsErr.message })
  const rows = (metricsRows || []) as any[]

  const daysWithCheckin = rows.length

  // If there’s basically no data, return a gentle default
  if (daysWithCheckin < 2) {
    return {
      success: true,
      period: { start: start7, end: today, checkins: daysWithCheckin },
      options: [
        {
          id: 'stress_downshift',
          title: 'Downshift your nervous system',
          why: 'With only a little data so far, the best move is a tiny daily reset while you keep logging.',
          effort: 'low',
          impact: 'moderate',
          preset: null
        }
      ]
    }
  }

  // Helpers
  const nums = (key: string) =>
    rows.map((r) => r[key]).filter((v: any) => typeof v === 'number' && Number.isFinite(v)) as number[]

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

  const stddev = (xs: number[]) => {
    if (xs.length < 2) return null
    const m = avg(xs)!
    const variance = xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1)
    return Math.sqrt(variance)
  }

  const sleepAvg = avg(nums('sleep_hours'))
  const energyAvg = avg(nums('energy'))
  const moodAvg = avg(nums('mood'))
  const stressAvg = avg(nums('stress'))
  const outdoorAvg = avg(nums('outdoor_minutes'))
  const waterAvg = avg(nums('water_liters'))
  const stepsAvg = avg(nums('steps'))

  const sleepVar = stddev(nums('sleep_hours')) // “variance” proxy

  // ---- Habit completion (simple) ----
  const { data: habits } = await supabase
    .from('habits')
    .select('id,archived')
    .eq('user_id', uid)
    .or('archived.is.null,archived.eq.false')

  const activeHabitIds = new Set((habits || []).map((h: any) => h.id))
  const activeHabitCount = activeHabitIds.size

  const { data: entries } = await supabase
    .from('habit_entries')
    .select('habit_id,date,completed')
    .eq('user_id', uid)
    .gte('date', start7)
    .lte('date', today)

  const completedEntries = (entries || []).filter((e: any) => e.completed !== false && activeHabitIds.has(e.habit_id))

  const denom = activeHabitCount > 0 ? activeHabitCount * 7 : 0
  const habitRate = denom > 0 ? completedEntries.length / denom : null

  // ---- Scoring rules (safe, simple) ----
  // We score candidates 0..100 roughly. Then we pick A (lowest effort among top) and B (best overall).
  const options: NextFocusOption[] = []

  // Sleep lever
  {
    let score = 0
    const varHigh = typeof sleepVar === 'number' && sleepVar >= 1.1 // tune later
    const sleepLow = typeof sleepAvg === 'number' && sleepAvg < 6.5
    const energyLow = typeof energyAvg === 'number' && energyAvg <= 3.2
    const stressHigh = typeof stressAvg === 'number' && stressAvg >= 3.6

    if (varHigh) score += 30
    if (sleepLow) score += 25
    if (energyLow) score += 20
    if (stressHigh) score += 10
    score += clamp(daysWithCheckin * 2, 0, 14)

    options.push({
      id: 'sleep',
      title: 'Stabilize sleep rhythm',
      why: varHigh
        ? 'Sleep looks a bit variable this week — consistency may help your energy and mood stabilize.'
        : sleepLow
          ? 'Sleep looks a bit short on average — a small earlier wind-down could lift the whole week.'
          : 'A steadier wind-down can protect energy without adding pressure.',
      effort: 'low',
      impact: (energyLow || stressHigh || varHigh) ? 'high' : 'moderate',
      preset: { 
  title: 'Sleep consistency',
  leverType: 'metric',
  leverRef: 'sleep_hours',
  targetMetric: 'energy',
  effortEstimate: 'low',
  expectedImpact: 'high',
  recommendedDays: 7,
  baselineDays: 30
},
      score
    })
  }

  // Outdoor lever
  {
    let score = 0
    const outdoorLow = typeof outdoorAvg === 'number' && outdoorAvg < 15
    const stressHigh = typeof stressAvg === 'number' && stressAvg >= 3.6
    const moodLow = typeof moodAvg === 'number' && moodAvg <= 3.0

    if (outdoorLow) score += 35
    if (stressHigh) score += 20
    if (moodLow) score += 15
    score += clamp(daysWithCheckin * 2, 0, 14)

    options.push({
      id: 'outdoor',
      title: 'Get light + air daily',
      why: outdoorLow
        ? 'Outdoor time looks low this week — even a short walk can shift stress and mood.'
        : 'A short daily reset outside can keep stress from accumulating.',
      effort: 'low',
      impact: (outdoorLow && (stressHigh || moodLow)) ? 'high' : 'moderate',
      preset: { 
  title: 'Sleep consistency',
  leverType: 'metric',
  leverRef: 'sleep_hours',
  targetMetric: 'energy',
  effortEstimate: 'low',
  expectedImpact: 'high',
  recommendedDays: 7,
  baselineDays: 30
},
      score
    })
  }

  // Hydration lever
  {
    let score = 0
    const waterLow = typeof waterAvg === 'number' && waterAvg < 1.4
    const energyLow = typeof energyAvg === 'number' && energyAvg <= 3.2
    const stressHigh = typeof stressAvg === 'number' && stressAvg >= 3.6

    if (waterLow) score += 35
    if (energyLow) score += 15
    if (stressHigh) score += 10
    score += clamp(daysWithCheckin * 2, 0, 14)

    options.push({
      id: 'hydration',
      title: 'Make hydration effortless',
      why: waterLow
        ? 'Hydration looks low this week — a tiny routine can help energy feel steadier.'
        : 'A simple water cue can support energy without changing much else.',
      effort: 'low',
      impact: (waterLow && energyLow) ? 'high' : 'moderate',
      preset: { 
  title: 'Sleep consistency',
  leverType: 'metric',
  leverRef: 'sleep_hours',
  targetMetric: 'energy',
  effortEstimate: 'low',
  expectedImpact: 'high',
  recommendedDays: 7,
  baselineDays: 30
},
      score
    })
  }

  // Movement lever (only if steps are low AND energy not crashing)
  {
    let score = 0
    const stepsLow = typeof stepsAvg === 'number' && stepsAvg < 4500
    const energyOk = typeof energyAvg === 'number' && energyAvg >= 2.8
    const moodLow = typeof moodAvg === 'number' && moodAvg <= 3.0

    if (stepsLow) score += 30
    if (moodLow) score += 10
    if (!energyOk) score -= 15 // don’t push movement when energy is low
    score += clamp(daysWithCheckin * 2, 0, 14)

    options.push({
      id: 'movement',
      title: 'Add gentle movement',
      why: stepsLow
        ? 'Movement looks a bit low — a 10–15 minute walk can raise baseline mood and focus.'
        : 'A small daily walk keeps your system “unstuck” without needing motivation.',
      effort: 'moderate',
      impact: (stepsLow && energyOk) ? 'high' : 'moderate',
      preset: { 
  title: 'Sleep consistency',
  leverType: 'metric',
  leverRef: 'sleep_hours',
  targetMetric: 'energy',
  effortEstimate: 'low',
  expectedImpact: 'high',
  recommendedDays: 7,
  baselineDays: 30
},
      score
    })
  }

  // Stress downshift (good default when stress high)
  {
    let score = 0
    const stressHigh = typeof stressAvg === 'number' && stressAvg >= 3.6
    const sleepLow = typeof sleepAvg === 'number' && sleepAvg < 6.5
    const moodLow = typeof moodAvg === 'number' && moodAvg <= 3.0

    if (stressHigh) score += 40
    if (sleepLow) score += 10
    if (moodLow) score += 10
    score += clamp(daysWithCheckin * 2, 0, 14)

    options.push({
      id: 'stress_downshift',
      title: 'Protect your stress baseline',
      why: stressHigh
        ? 'Stress looks elevated — a daily 60–90 second downshift can prevent carryover.'
        : 'A tiny daily downshift keeps things steady when the week is busy.',
      effort: 'low',
      impact: stressHigh ? 'high' : 'moderate',
      preset: { 
  title: 'Sleep consistency',
  leverType: 'metric',
  leverRef: 'sleep_hours',
  targetMetric: 'energy',
  effortEstimate: 'low',
  expectedImpact: 'high',
  recommendedDays: 7,
  baselineDays: 30
},
      score
    })
  }

  // If habit logging exists and habit rate is low, slightly boost low-effort options
  if (typeof habitRate === 'number' && habitRate < 0.35) {
    for (const o of options) {
      if (o.effort === 'low') o.score += 6
    }
  }

  const picked = pickTop2(options)

  return {
    success: true,
    period: { start: start7, end: today, checkins: daysWithCheckin },
    context: {
      // optional debug (you can remove later)
      sleep_avg: sleepAvg,
      sleep_sd: sleepVar,
      mood_avg: moodAvg,
      energy_avg: energyAvg,
      stress_avg: stressAvg,
      outdoor_avg: outdoorAvg,
      water_avg: waterAvg,
      habit_completion_rate: habitRate
    },
    options: picked
  }
})
