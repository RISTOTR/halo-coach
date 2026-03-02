// server/api/ai/weekly-goal-suggestions.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import OpenAI from 'openai'

const bodySchema = z.object({
  endDate: z.string().optional() // YYYY-MM-DD
})

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay() // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  if (!config.openaiApiKey) {
    console.error('OPENAI_API_KEY is not set')
    throw createError({
      statusCode: 500,
      statusMessage: 'OPENAI_API_KEY is not configured.'
    })
  }

  const { endDate } = bodySchema.parse(await readBody(event))

  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = await serverSupabaseClient(event)
  const client = new OpenAI({ apiKey: config.openaiApiKey })

  const end = endDate ? new Date(endDate) : new Date()
  const normalizedEnd = end.toISOString().slice(0, 10)
  const weekStart = getWeekStart(normalizedEnd)

  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  const normalizedStart = start.toISOString().slice(0, 10)

  // 1) Load weekly aggregates like in weekly-summary
  const { data: metricsRows, error: metricsError } = await supabase
    .from('daily_metrics')
    .select('*')
    .eq('user_id', user.sub)
    .gte('date', normalizedStart)
    .lte('date', normalizedEnd)
    .order('date')

  if (metricsError) {
    console.error(metricsError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load weekly metrics' })
  }

  const metricsData = metricsRows || []
  if (!metricsData.length) {
    return { goals: [] }
  }

  const avg = (nums: number[]) =>
    nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null

  const sleepValues = metricsData
    .map((d) => d.sleep_hours)
    .filter((v) => typeof v === 'number') as number[]
  const moodValues = metricsData
    .map((d) => d.mood)
    .filter((v) => typeof v === 'number') as number[]
  const energyValues = metricsData
    .map((d) => d.energy)
    .filter((v) => typeof v === 'number') as number[]
  const stressValues = metricsData
    .map((d) => d.stress)
    .filter((v) => typeof v === 'number') as number[]
  const waterValues = metricsData
    .map((d) => d.water_liters)
    .filter((v) => typeof v === 'number') as number[]
  const movementValues = metricsData
    .map((d) => d.steps)
    .filter((v) => typeof v === 'number') as number[]
  const outdoorValues = metricsData
    .map((d) => d.outdoor_minutes)
    .filter((v) => typeof v === 'number') as number[]

  const weeklyAggregates = {
    avg_sleep_hours: avg(sleepValues),
    avg_mood: avg(moodValues),
    avg_energy: avg(energyValues),
    avg_stress: avg(stressValues),
    avg_water_liters: avg(waterValues),
    avg_movement_minutes: avg(movementValues),
    avg_outdoor_minutes: avg(outdoorValues)
  }

  // Habits
  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id, name, frequency, target_per_week')
    .eq('user_id', user.sub)
    .eq('archived', false)

  if (habitsError) {
    console.error(habitsError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load habits' })
  }

  const { data: logs, error: logsError } = await supabase
    .from('habit_logs')
    .select('habit_id, date, completed')
    .eq('user_id', user.sub)
    .gte('date', normalizedStart)
    .lte('date', normalizedEnd)

  if (logsError) {
    console.error(logsError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load habit logs' })
  }

  const habitSummary = (habits || []).map((h) => {
    const habitLogs = (logs || []).filter((l) => l.habit_id === h.id && l.completed)
    return {
      name: h.name,
      frequency: h.frequency,
      completions: habitLogs.length,
      target_per_week: h.target_per_week
    }
  })

  // Journal
  const { data: journalRows, error: journalError } = await supabase
    .from('journal_entries')
    .select('date, content')
    .eq('user_id', user.sub)
    .eq('type', 'evening')
    .gte('date', normalizedStart)
    .lte('date', normalizedEnd)
    .order('date', { ascending: true })

  if (journalError) {
    console.error(journalError)
  }

  const journalSnippets =
    (journalRows || [])
      .map((j) => {
        const snippet =
          j.content.length > 200 ? j.content.slice(0, 200) + '…' : j.content
        return `${j.date}: "${snippet}"`
      })
      .join('\n') || 'No reflections were written this week.'

  const metricsSummaryText = JSON.stringify(weeklyAggregates, null, 2)
  const habitsText = habitSummary
    .map(
      (h) =>
        `${h.name} (${h.frequency}) → ${h.completions} completions (target ${h.target_per_week ?? 'n/a'})`
    )
    .join('\n') || 'No active habits.'

  const systemPrompt = `
You are Halo, a calm, encouraging health coach.
Based on the user's last 7 days, propose 2–3 very small, realistic weekly goals.

You must return ONLY valid JSON, with this shape:

{
  "goals": [
    { "title": "string", "category": "sleep|movement|mind|stress|habits|other" },
    ...
  ]
}

No explanation, no extra text.
`.trim()

  const userPrompt = `
Time window:
- From: ${normalizedStart}
- To:   ${normalizedEnd}
- Week anchor (Monday): ${weekStart}

Weekly aggregates:
${metricsSummaryText}

Habits summary:
${habitsText}

Journal snippets:
${journalSnippets}
`.trim()

  const response = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  })

  const raw =
    response.output?.[0]?.content?.[0]?.type === 'output_text'
      ? response.output[0].content[0].text
      : null

  if (!raw) {
    return { goals: [] }
  }

  let parsed: any = null
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    console.error('Failed to parse weekly goal suggestions JSON', e, raw)
    return { goals: [] }
  }

  const goals = Array.isArray(parsed?.goals) ? parsed.goals : []

  // Normalize categories
  const allowedCats = ['sleep', 'movement', 'mind', 'stress', 'habits', 'other']
  const normalizedGoals = goals
    .filter((g: any) => typeof g.title === 'string' && g.title.trim().length > 0)
    .map((g: any) => {
      const cat = typeof g.category === 'string' ? g.category.toLowerCase() : 'other'
      return {
        title: g.title.trim(),
        category: (allowedCats.includes(cat) ? cat : 'other') as
          | 'sleep'
          | 'movement'
          | 'mind'
          | 'stress'
          | 'habits'
          | 'other'
      }
    })

  return { goals: normalizedGoals }
})
