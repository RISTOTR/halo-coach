// server/api/reports/overview.get.ts
import { defineEventHandler, getQuery, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const querySchema = z.object({
  days: z.coerce.number().int().min(7).max(180).optional()
})

type MetricKey = 'sleep_hours' | 'mood' | 'stress' | 'energy'

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function daysAgoISO(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return isoDate(d)
}

function avg(nums: number[]) {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function round1(n: number | null) {
  if (n == null) return null
  return Math.round(n * 10) / 10
}

function round2(n: number | null) {
  if (n == null) return null
  return Math.round(n * 100) / 100
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  // supabase user object may expose id or sub depending on context
  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = await serverSupabaseClient(event)
  const { days } = querySchema.parse(getQuery(event))

  const rangeDays = days ?? 30
  const end = isoDate(new Date())
  const start = daysAgoISO(rangeDays - 1) // inclusive

  // ----------------------------
  // Metrics (range)
  // ----------------------------
  const { data: metrics, error: metricsErr } = await supabase
    .from('daily_metrics')
    .select('date,sleep_hours,mood,stress,energy')
    .eq('user_id', uid)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })

  if (metricsErr) throw createError({ statusCode: 500, statusMessage: metricsErr.message })

  const rows = (metrics || []) as Array<{
    date: string
    sleep_hours: number | null
    mood: number | null
    stress: number | null
    energy: number | null
  }>

  // Series points (unix seconds) for MiniSparkline
  const series = {
    sleep: rows.map((r) => ({ time: new Date(r.date).getTime() / 1000, value: r.sleep_hours ?? null })),
    mood: rows.map((r) => ({ time: new Date(r.date).getTime() / 1000, value: r.mood ?? null })),
    stress: rows.map((r) => ({ time: new Date(r.date).getTime() / 1000, value: r.stress ?? null })),
    energy: rows.map((r) => ({ time: new Date(r.date).getTime() / 1000, value: r.energy ?? null }))
  }

  // Summary: average over the selected window
  const sleepAvg = avg(rows.map((r) => r.sleep_hours).filter((v): v is number => typeof v === 'number'))
  const moodAvg = avg(rows.map((r) => r.mood).filter((v): v is number => typeof v === 'number'))
  const stressAvg = avg(rows.map((r) => r.stress).filter((v): v is number => typeof v === 'number'))
  const energyAvg = avg(rows.map((r) => r.energy).filter((v): v is number => typeof v === 'number'))

  // Helpers for deltas
  function avgMetric(list: typeof rows, key: MetricKey) {
    return avg(list.map((r) => r[key]).filter((v): v is number => typeof v === 'number'))
  }

  function deltaMetric(a: typeof rows, b: typeof rows, key: MetricKey) {
    const aAvg = avgMetric(a, key)
    const bAvg = avgMetric(b, key)
    if (aAvg == null || bAvg == null) return null
    return aAvg - bAvg
  }

  // ----------------------------
  // Deltas
  // Prefer week-over-week when possible, else within-window
  // ----------------------------
  const last7Start = daysAgoISO(6)
  const prev7Start = daysAgoISO(13)
  const prev7End = daysAgoISO(7)

  const last7 = rows.filter((r) => r.date >= last7Start && r.date <= end)

  // For 7d view, rows won't include prev week -> fetch prev week explicitly
  let prev7Rows = rows.filter((r) => r.date >= prev7Start && r.date <= prev7End)

  if (rangeDays < 14) {
    const { data: prevMetrics, error: prevErr } = await supabase
      .from('daily_metrics')
      .select('date,sleep_hours,mood,stress,energy')
      .eq('user_id', uid)
      .gte('date', prev7Start)
      .lte('date', prev7End)
      .order('date', { ascending: true })

    if (prevErr) throw createError({ statusCode: 500, statusMessage: prevErr.message })
    prev7Rows = (prevMetrics || []) as any
  }

  // Your existing WoW deltas (keep the name "deltas")
  const deltas = {
    sleep: deltaMetric(last7, prev7Rows, 'sleep_hours'),
    mood: deltaMetric(last7, prev7Rows, 'mood'),
    stress: deltaMetric(last7, prev7Rows, 'stress'),
    energy: deltaMetric(last7, prev7Rows, 'energy')
  }

  // Within-window fallback: second half vs first half of the selected window
  function deltaWithinWindow(list: typeof rows, key: MetricKey) {
    const numericCount = list.filter((r) => typeof r[key] === 'number').length
    if (numericCount < 4) return null // too little to compare cleanly

    const mid = Math.floor(list.length / 2)
    const firstHalf = list.slice(0, mid)
    const secondHalf = list.slice(mid)

    const aAvg = avgMetric(secondHalf, key)
    const bAvg = avgMetric(firstHalf, key)
    if (aAvg == null || bAvg == null) return null
    return aAvg - bAvg
  }

  const deltasWithinWindow = {
    sleep: deltaWithinWindow(rows, 'sleep_hours'),
    mood: deltaWithinWindow(rows, 'mood'),
    stress: deltaWithinWindow(rows, 'stress'),
    energy: deltaWithinWindow(rows, 'energy')
  }

  function hasValidDelta(d: Record<string, number | null>) {
    return Object.values(d).some((v) => typeof v === 'number' && Number.isFinite(v))
  }

  const delta_mode: 'week_over_week' | 'within_window' = hasValidDelta(deltas)
    ? 'week_over_week'
    : 'within_window'

  const delta_label = delta_mode === 'week_over_week' ? 'vs previous week' : 'second half vs first half'
  const finalDeltas = delta_mode === 'week_over_week' ? deltas : deltasWithinWindow

  // ----------------------------
  // Active habits (exclude archived)
  // ----------------------------
  const { data: habits, error: habitsErr } = await supabase
    .from('habits')
    .select('id,name,category,frequency,target_per_week,archived,created_at')
    .eq('user_id', uid)
    .or('archived.is.null,archived.eq.false')
    .order('created_at', { ascending: true })

  if (habitsErr) throw createError({ statusCode: 500, statusMessage: habitsErr.message })

  const activeHabits = (habits || []) as any[]
  const activeHabitCount = activeHabits.length

  // Habit entries in range
  const { data: entries, error: entriesErr } = await supabase
    .from('habit_entries')
    .select('habit_id,date,completed')
    .eq('user_id', uid)
    .gte('date', start)
    .lte('date', end)

  if (entriesErr) throw createError({ statusCode: 500, statusMessage: entriesErr.message })

  const completedEntries = (entries || []).filter((e: any) => e.completed !== false)

  // Completion rate (simple): total completed / (activeHabits * rangeDays)
  const denom = activeHabitCount > 0 ? activeHabitCount * rangeDays : 0
  const completionRate = denom > 0 ? completedEntries.length / denom : null

  // Per-habit completion count in range
  const perHabitCount = new Map<string, number>()
  for (const e of completedEntries as any[]) {
    perHabitCount.set(e.habit_id, (perHabitCount.get(e.habit_id) || 0) + 1)
  }

  const habitsPerformance = activeHabits.map((h) => {
    const c = perHabitCount.get(h.id) || 0
    return {
      id: h.id,
      name: h.name,
      category: h.category,
      frequency: h.frequency,
      target_per_week: h.target_per_week,
      completed_count: c,
      completion_rate: rangeDays ? c / rangeDays : 0
    }
  })

  // ---- Correlation helpers ----
function pearson(xs: number[], ys: number[]) {
  const n = Math.min(xs.length, ys.length)
  if (n < 5) return null // keep it reliable
  const x = xs.slice(0, n)
  const y = ys.slice(0, n)

  const meanX = x.reduce((a, b) => a + b, 0) / n
  const meanY = y.reduce((a, b) => a + b, 0) / n

  let num = 0
  let denX = 0
  let denY = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX
    const dy = y[i] - meanY
    num += dx * dy
    denX += dx * dx
    denY += dy * dy
  }
  const den = Math.sqrt(denX * denY)
  if (!den) return null
  return num / den
}

function corrPaired(
  rows: Array<any>,
  xKey: 'sleep_hours' | 'mood' | 'stress' | 'energy',
  yKey: 'sleep_hours' | 'mood' | 'stress' | 'energy'
) {
  const xs: number[] = []
  const ys: number[] = []
  for (const r of rows) {
    const x = r[xKey]
    const y = r[yKey]
    if (typeof x === 'number' && typeof y === 'number') {
      xs.push(x)
      ys.push(y)
    }
  }
  return pearson(xs, ys)
}

// ---- Build daily habit completion series for the window ----
const activeHabitIds = new Set(activeHabits.map(h => h.id))


// index completed entries by date
const completedByDate = new Map<string, number>()
for (const e of completedEntries as any[]) {
  // ensure it's for active habits only
  if (!activeHabitIds.has(e.habit_id)) continue
  const d = String(e.date)
  completedByDate.set(d, (completedByDate.get(d) || 0) + 1)
}

// build per-day points aligned with daily_metrics rows
const habitDaily = rows.map(r => {
  const done = completedByDate.get(r.date) || 0
  const denom = activeHabitCount || 0
  const rate = denom > 0 ? done / denom : null
  return { date: r.date, rate, done }
})

// ---- Correlations (only when meaningful) ----
const sleepMood = corrPaired(rows, 'sleep_hours', 'mood')

// habits→stress: pair habit rate with stress by date (only where both exist)
let habitStress: number | null = null
{
  const xs: number[] = [] // habit rate
  const ys: number[] = [] // stress
  const mapRate = new Map(habitDaily.map(d => [d.date, d.rate]))
  for (const r of rows) {
    const rate = mapRate.get(r.date)
    const stress = r.stress
    if (typeof rate === 'number' && typeof stress === 'number') {
      xs.push(rate)
      ys.push(stress)
    }
  }
   habitStress = pearson(xs, ys)
}

const sleepStress = corrPaired(rows, 'sleep_hours', 'stress')
const energyMood = corrPaired(rows, 'energy', 'mood')

// ---- “What worked” insight sentences (1–3) ----
function abs(n: number) { return Math.abs(n) }
function fmtR(r: number) { return Math.round(r * 100) / 100 }

const insights: string[] = []

if (typeof sleepMood === 'number' && abs(sleepMood) >= 0.25) {
  if (sleepMood > 0) insights.push(`On days you slept more, mood tended to be higher (r=${fmtR(sleepMood)}).`)
  else insights.push(`On days you slept more, mood tended to be lower (r=${fmtR(sleepMood)}).`)
}

if (typeof habitStress === 'number' && abs(habitStress) >= 0.25) {
  if (habitStress < 0) insights.push(`When habit completion was higher, stress tended to be lower (r=${fmtR(habitStress)}).`)
  else insights.push(`When habit completion was higher, stress tended to be higher (r=${fmtR(habitStress)}).`)
}

if (insights.length < 2 && typeof sleepStress === 'number' && abs(sleepStress) >= 0.25) {
  if (sleepStress < 0) insights.push(`More sleep often aligned with lower stress (r=${fmtR(sleepStress)}).`)
  else insights.push(`More sleep often aligned with higher stress (r=${fmtR(sleepStress)}).`)
}

if (insights.length < 3 && typeof energyMood === 'number' && abs(energyMood) >= 0.25) {
  if (energyMood > 0) insights.push(`Higher energy tended to come with higher mood (r=${fmtR(energyMood)}).`)
}

// If nothing robust, keep it calm
if (!insights.length) {
  insights.push(`Not enough consistent data yet for strong correlations — keep logging and Halo will start spotting patterns.`)
}

// cap to 3 for Halo vibe
const whatWorked = insights.slice(0, 3)

// ---- Add to response ----
const correlations = {
  sleep_to_mood: sleepMood,
  habit_completion_to_stress: habitStress ?? null,
  sleep_to_stress: sleepStress,
  energy_to_mood: energyMood
}


  return {
    period: { start, end, days: rangeDays },
    checkins: rows.length,
    delta_mode,
    delta_label,
    summary: {
      sleep_avg: round1(sleepAvg),
      mood_avg: round1(moodAvg),
      stress_avg: round1(stressAvg),
      energy_avg: round1(energyAvg),
      habit_completion_rate: completionRate == null ? null : round2(completionRate)
    },
    deltas: {
      sleep: round1(finalDeltas.sleep),
      mood: round1(finalDeltas.mood),
      stress: round1(finalDeltas.stress),
      energy: round1(finalDeltas.energy)
    },
    series,
    habits: {
      active_count: activeHabitCount,
      performance: habitsPerformance
    },
    correlations,
      what_worked: whatWorked,
      // optional: provide daily habit series if you later want to draw it
      habit_daily: habitDaily.map(d => ({
        time: new Date(d.date).getTime() / 1000,
        value: d.rate
      }))
  }
})
