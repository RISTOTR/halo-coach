import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import OpenAI from 'openai'
import { stringifyReport } from '~/server/utils/aiReportContent'

const bodySchema = z.object({
  endDate: z.string().optional() // YYYY-MM-DD
})

type MetricKey = 'sleep_hours' | 'mood' | 'stress' | 'energy'

const weeklyOutSchema = z.object({
  wins: z.array(z.string()).min(1).max(2),
  drift: z.array(z.string()).max(2),
  next_focus: z.string().min(1).max(140),
  confidence: z.enum(['low', 'moderate', 'strong'])
})
type WeeklyOut = z.infer<typeof weeklyOutSchema>

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}
function daysAgoISO(n: number, from = new Date()) {
  const d = new Date(from)
  d.setDate(d.getDate() - n)
  return isoDate(d)
}

function avg(nums: number[]) {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}
function avgMetric(rows: any[], key: MetricKey) {
  return avg(rows.map((r) => r[key]).filter((v: any): v is number => typeof v === 'number'))
}
function deltaMetric(a: any[], b: any[], key: MetricKey) {
  const aAvg = avgMetric(a, key)
  const bAvg = avgMetric(b, key)
  if (aAvg == null || bAvg == null) return null
  return aAvg - bAvg
}
function strongestDelta(deltas: Record<string, number | null>) {
  const vals = Object.values(deltas).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (!vals.length) return null
  vals.sort((a, b) => Math.abs(b) - Math.abs(a))
  return vals[0]
}
function computeConfidence(daysWithCheckin: number, top: number | null): 'low' | 'moderate' | 'strong' {
  if (daysWithCheckin < 5) return 'low'
  if (top == null) return 'low'
  if (Math.abs(top) >= 0.6 && daysWithCheckin >= 7) return 'strong'
  return 'moderate'
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (!config.openaiApiKey) throw createError({ statusCode: 500, statusMessage: 'OPENAI_API_KEY is not configured.' })

  const { endDate } = bodySchema.parse(await readBody(event))

  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub

  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = await serverSupabaseClient(event)
  const client = new OpenAI({ apiKey: config.openaiApiKey })

  const end = endDate ? new Date(endDate) : new Date()
  const normalizedEnd = isoDate(end)

  // 14d window so we can do WoW
  const start14 = daysAgoISO(13, end)
  const start7 = daysAgoISO(6, end)
  const prev7Start = daysAgoISO(13, end)
  const prev7End = daysAgoISO(7, end)

  const { data: metricsRows, error: metricsError } = await supabase
    .from('daily_metrics')
    .select('date,sleep_hours,mood,stress,energy,water_liters,steps,outdoor_minutes')
    .eq('user_id', uid)
    .gte('date', start14)
    .lte('date', normalizedEnd)
    .order('date', { ascending: true })

  if (metricsError) throw createError({ statusCode: 500, statusMessage: 'Failed to load weekly metrics' })

  const rows = metricsRows || []
  const last7 = rows.filter((r) => r.date >= start7 && r.date <= normalizedEnd)
  const prev7 = rows.filter((r) => r.date >= prev7Start && r.date <= prev7End)

  if (!last7.length) return { summary: null }

  const daysWithCheckin = last7.length

  const deltasWoW = {
    sleep: deltaMetric(last7, prev7, 'sleep_hours'),
    mood: deltaMetric(last7, prev7, 'mood'),
    stress: deltaMetric(last7, prev7, 'stress'),
    energy: deltaMetric(last7, prev7, 'energy')
  }

  function deltaWithinWindow(list: any[], key: MetricKey) {
    const numericCount = list.filter((r) => typeof r[key] === 'number').length
    if (numericCount < 4) return null
    const mid = Math.floor(list.length / 2)
    const firstHalf = list.slice(0, mid)
    const secondHalf = list.slice(mid)
    return deltaMetric(secondHalf, firstHalf, key)
  }

  const deltasWithin = {
    sleep: deltaWithinWindow(last7, 'sleep_hours'),
    mood: deltaWithinWindow(last7, 'mood'),
    stress: deltaWithinWindow(last7, 'stress'),
    energy: deltaWithinWindow(last7, 'energy')
  }

  const hasWoW = Object.values(deltasWoW).some((v) => typeof v === 'number' && Number.isFinite(v))
  const delta_mode: 'week_over_week' | 'within_window' = hasWoW ? 'week_over_week' : 'within_window'
  const finalDeltas = hasWoW ? deltasWoW : deltasWithin

  const confidence = computeConfidence(daysWithCheckin, strongestDelta(finalDeltas))

  // ---- Habits (now using habit_entries per your fix) ----
  const { data: habits } = await supabase
    .from('habits')
    .select('id,name,frequency,target_per_week,archived')
    .eq('user_id', uid)
    .or('archived.is.null,archived.eq.false')

  const { data: entries, error: entriesErr } = await supabase
    .from('habit_entries')
    .select('habit_id,date,completed')
    .eq('user_id', uid)
    .gte('date', start7)
    .lte('date', normalizedEnd)

  if (entriesErr) throw createError({ statusCode: 500, statusMessage: 'Failed to load habit entries' })

  const habitSummary = (habits || []).map((h: any) => {
    const c = (entries || []).filter((e: any) => e.habit_id === h.id && e.completed !== false).length
    return { name: h.name, completions: c, frequency: h.frequency, target_per_week: h.target_per_week ?? null }
  })

  // ---- Journal (keep short) ----
  const { data: journalRows } = await supabase
    .from('journal_entries')
    .select('date,content')
    .eq('user_id', uid)
    .eq('type', 'evening')
    .gte('date', start7)
    .lte('date', normalizedEnd)
    .order('date', { ascending: true })

  const journalSnippets = (journalRows || [])
    .map((j: any) => (j.content?.length > 180 ? j.content.slice(0, 180) + '…' : j.content))
    .slice(-5)

  // ---- Goals (keep your existing goal block if you want; here we keep it minimal) ----
  // If you want the full goalsText you already built, reuse it here.
  // const goalsText = ...

  const prompt = `
Return STRICT JSON ONLY. No markdown. No prose. No code fences.

Schema:
{
  "wins": [string, string?],
  "drift": [string?, string?],
  "next_focus": string,
  "confidence": "low" | "moderate" | "strong"
}

Rules:
- wins: 1–2 concrete wins based on habits/goals/journal themes.
- drift: 0–2 risks (if none, return []).
- next_focus: ONE gentle focus for next week (one sentence).
- confidence MUST be "${confidence}" exactly.
- confidence must be exactly one of: low, moderate, strong
- Do not include raw numbers.
- When mentioning habits, use exact habit names from the list.

Time window: ${start7} to ${normalizedEnd}
Delta mode: ${delta_mode}
Deltas (approx): ${JSON.stringify(finalDeltas)}
Habit completions: ${JSON.stringify(habitSummary)}
Journal snippets: ${JSON.stringify(journalSnippets)}
`.trim()

  const response = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: [{ role: 'user', content: prompt }]
  })

  const text =
    response.output?.[0]?.content?.[0]?.type === 'output_text'
      ? response.output[0].content[0].text
      : null

  if (!text) return { summary: null }

  let parsed: unknown = null
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = null
  }

  const validated = weeklyOutSchema.safeParse(parsed)

  const safeSummary: WeeklyOut = validated.success
    ? validated.data
    : {
        wins: ['You captured enough of the week to learn from it.'],
        drift: [],
        next_focus: 'Pick one small lever and keep it easy for 7 days.',
        confidence
      }

  // Store JSON in ai_reports.content (text)
  const { error: upsertError } = await supabase
    .from('ai_reports')
    .upsert(
      {
        user_id: uid,
        date: normalizedEnd,
        period: 'weekly',
        content: stringifyReport(safeSummary)
      },
      { onConflict: 'user_id,date,period' }
    )

  if (upsertError) console.error('Failed to upsert weekly ai_report', upsertError)

  return {
    summary: safeSummary,
    meta: {
      delta_mode,
      deltas: finalDeltas,
      days_with_checkin: daysWithCheckin
    }
  }
})
