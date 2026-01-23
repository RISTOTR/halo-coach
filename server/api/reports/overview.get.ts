import { defineEventHandler, getQuery, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const querySchema = z.object({
  days: z.coerce.number().int().min(7).max(180).optional()
})

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

function addDaysISO(iso: string, days: number) {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = await serverSupabaseClient(event)
  const { days } = querySchema.parse(getQuery(event))

  const rangeDays = days ?? 30
  const end = isoDate(new Date())
  const start = daysAgoISO(rangeDays - 1) // inclusive

  // Fetch metrics (range)
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

  // Build series points (unix seconds for your MiniSparkline usage)
  const series = {
    sleep: rows.map((r) => ({ time: new Date(r.date).getTime() / 1000, value: r.sleep_hours ?? null })),
    mood: rows.map((r) => ({ time: new Date(r.date).getTime() / 1000, value: r.mood ?? null })),
    stress: rows.map((r) => ({ time: new Date(r.date).getTime() / 1000, value: r.stress ?? null })),
    energy: rows.map((r) => ({ time: new Date(r.date).getTime() / 1000, value: r.energy ?? null }))
  }

  // Summary: average over range
  const sleepAvg = avg(rows.map(r => r.sleep_hours).filter((v): v is number => typeof v === 'number'))
  const moodAvg = avg(rows.map(r => r.mood).filter((v): v is number => typeof v === 'number'))
  const stressAvg = avg(rows.map(r => r.stress).filter((v): v is number => typeof v === 'number'))
  const energyAvg = avg(rows.map(r => r.energy).filter((v): v is number => typeof v === 'number'))

  // Weekly deltas: last 7 days vs previous 7 days (if enough data range)
const last7Start = daysAgoISO(6)
const prev7Start = daysAgoISO(13)
const prev7End = daysAgoISO(7)

const last7 = rows.filter(r => r.date >= last7Start && r.date <= end)

let prev7Rows = rows.filter(r => r.date >= prev7Start && r.date <= prev7End)

if (rangeDays < 14) {
  const { data: prevMetrics, error: prevErr } = await supabase
    .from('daily_metrics')
    .select('date,sleep_hours,mood,stress,energy')
    .eq('user_id', uid)
    .gte('date', prev7Start)
    .lte('date', prev7End)
    .order('date', { ascending: true })

  if (prevErr) throw createError({ statusCode: 500, statusMessage: prevErr.message })

  prev7Rows = (prevMetrics || []) as any[]
}

function avgMetric(list: typeof rows, key: 'sleep_hours'|'mood'|'stress'|'energy') {
  return avg(list.map(r => r[key]).filter((v): v is number => typeof v === 'number'))
}

function deltaMetric(
  a: typeof rows,
  b: typeof rows,
  key: 'sleep_hours'|'mood'|'stress'|'energy'
) {
  const aAvg = avgMetric(a, key)
  const bAvg = avgMetric(b, key)
  if (aAvg == null || bAvg == null) return null
  return aAvg - bAvg
}

const deltas = {
  sleep: deltaMetric(last7, prev7Rows, 'sleep_hours'),
  mood: deltaMetric(last7, prev7Rows, 'mood'),
  stress: deltaMetric(last7, prev7Rows, 'stress'),
  energy: deltaMetric(last7, prev7Rows, 'energy')
}

  // Active habits
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

  const completedEntries = (entries || []).filter(e => e.completed !== false)

  // Completion rate (simple): total completed / (activeHabits * rangeDays)
  const denom = activeHabitCount > 0 ? (activeHabitCount * rangeDays) : 0
  const completionRate = denom > 0 ? (completedEntries.length / denom) : null

  // Per-habit completion count in range
  const perHabitCount = new Map<string, number>()
  for (const e of completedEntries) {
    perHabitCount.set(e.habit_id, (perHabitCount.get(e.habit_id) || 0) + 1)
  }

  const habitsPerformance = activeHabits.map(h => {
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

  return {
    period: { start, end, days: rangeDays },
    checkins: rows.length,
    summary: {
      sleep_avg: round1(sleepAvg),
      mood_avg: round1(moodAvg),
      stress_avg: round1(stressAvg),
      energy_avg: round1(energyAvg),
      habit_completion_rate: completionRate == null ? null : round2(completionRate)
    },
    deltas: {
  sleep: round1(deltas.sleep),
  mood: round1(deltas.mood),
  stress: round1(deltas.stress),
  energy: round1(deltas.energy)
},

    series,
    habits: {
      active_count: activeHabitCount,
      performance: habitsPerformance
    }
  }
})
