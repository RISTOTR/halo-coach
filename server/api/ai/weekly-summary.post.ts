// server/api/ai/weekly-summary.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import OpenAI from 'openai'

const bodySchema = z.object({
  endDate: z.string().optional() // YYYY-MM-DD, opcional
})

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay() // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day // llevar al lunes
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

  // Fecha de fin (por defecto hoy)
  const end = endDate ? new Date(endDate) : new Date()
  const normalizedEnd = end.toISOString().slice(0, 10)

  // Semana de referencia (lunes)
  const weekStart = getWeekStart(normalizedEnd)

  // Para las métricas seguimos usando "últimos 7 días" (simple)
  const metricsStart = new Date(end)
  metricsStart.setDate(metricsStart.getDate() - 6)
  const normalizedStart = metricsStart.toISOString().slice(0, 10)

  // 1) DAILY METRICS (últimos 7 días)
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
    return { summary: null }
  }

  const daysWithCheckin = metricsData.length

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
    .map((d) => d.steps) // movement / exercise (min)
    .filter((v) => typeof v === 'number') as number[]

  const outdoorValues = metricsData
    .map((d) => d.outdoor_minutes)
    .filter((v) => typeof v === 'number') as number[]

  const weeklyAggregates = {
    days_covered: 7,
    days_with_checkin: daysWithCheckin,
    avg_sleep_hours: avg(sleepValues),
    min_sleep_hours: sleepValues.length ? Math.min(...sleepValues) : null,
    max_sleep_hours: sleepValues.length ? Math.max(...sleepValues) : null,
    avg_mood: avg(moodValues),
    avg_energy: avg(energyValues),
    avg_stress: avg(stressValues),
    avg_water_liters: avg(waterValues),
    total_movement_minutes: movementValues.reduce((a, b) => a + b, 0),
    avg_movement_minutes: avg(movementValues),
    avg_outdoor_minutes: avg(outdoorValues)
  }

  // 2) HABITS + LOGS (últimos 7 días)
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
    const completions = habitLogs.length

    let possible = 7
    if (h.frequency === 'weekly' && typeof h.target_per_week === 'number') {
      possible = h.target_per_week
    }

    return {
      name: h.name,
      frequency: h.frequency,
      completions,
      reference_target: possible
    }
  })

  const habitsText =
    habitSummary.length === 0
      ? 'No active habits defined this week.'
      : habitSummary
          .map(
            (h) =>
              `- ${h.name} (${h.frequency}) → completed ${h.completions} times (target around ${h.reference_target})`
          )
          .join('\n')

  // 3) JOURNAL ENTRIES (últimos 7 días)
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
          j.content.length > 220 ? j.content.slice(0, 220) + '…' : j.content
        return `${j.date}: "${snippet}"`
      })
      .join('\n') || 'No reflections were written this week.'

  // 🔴 4) WEEKLY GOALS (INTEGRACIÓN NUEVA)
  const { data: weeklyGoals, error: weeklyGoalsError } = await supabase
    .from('weekly_goals')
    .select('title, description, category, status')
    .eq('user_id', user.sub)
    .eq('week_start', weekStart)
    .order('created_at')

  if (weeklyGoalsError) {
    console.error('Failed to load weekly goals', weeklyGoalsError)
  }

  let goalsText = 'No explicit weekly goals were set for this week.'

  if (weeklyGoals && weeklyGoals.length > 0) {
    const totalGoals = weeklyGoals.length
    const doneGoals = weeklyGoals.filter((g) => g.status === 'done').length
    const inProgressGoals = weeklyGoals.filter((g) => g.status === 'in_progress').length
    const pendingGoals = weeklyGoals.filter((g) => g.status === 'pending').length
    const skippedGoals = weeklyGoals.filter((g) => g.status === 'skipped').length

    const lines = weeklyGoals.map((g) => {
      const label = g.category ? `${g.category}` : 'general'
      return `- [${g.status}] ${g.title} (${label})`
    })

    goalsText = `
Weekly goals snapshot:
- Total goals: ${totalGoals}
- Done: ${doneGoals}, In progress: ${inProgressGoals}, Pending: ${pendingGoals}, Skipped: ${skippedGoals}

Details:
${lines.join('\n')}
`.trim()
  }

  // 5) Montar texto para la IA
  const metricsSummaryText = JSON.stringify(weeklyAggregates, null, 2)

  const prompt = `

Time window:
- From: ${normalizedStart}
- To:   ${normalizedEnd}
- Week anchor (for goals): starting ${weekStart}

Weekly numeric summary (already pre-aggregated, don't repeat it as raw numbers):
${metricsSummaryText}

Habits over the week:
${habitsText}

Journal reflections (last 7 days, chronological):
${journalSnippets}

Weekly goals for this week (including their status):
${goalsText}

You are Halo, a calm, grounded, emotionally intelligent wellbeing coach.
Your task is to write a weekly reflection based on the user’s last 7 days:
- daily metrics (sleep, movement, mood, energy, stress, outdoor time, hydration)
- **habits** and whether they were completed
- **weekly goals** and how they relate to what actually happened
- **journal reflections** and emotional themes
- overall patterns across the week (not day-by-day)

Your reflection should be warm, non-judgemental, specific, and supportive — never generic.

STYLE & STRUCTURE
- Use **3–4 short paragraphs**.
- Do **not** list raw numbers. Use them only to understand **patterns**.
- Maximum ~230 words.
- Avoid bullet points.
- Keep a warm, human tone — never patronizing or overly optimistic.
- You MUST use Markdown bold (**text**) to emphasise key insights, habits, goals, or emotional themes.

WHAT TO EMPHASIZE
- Speak about the **week as a whole**. Not every day.
- Start with the **most meaningful theme** of the week.  
  Do **not** always begin with sleep. Start with **habits**, **weekly goals**, **emotional patterns**, or something that appeared repeatedly.
- Place **habits** and **weekly goals** in the **first or second paragraph** so the user sees that their choices matter.

HABITS & GOALS
- Highlight small wins, partial progress, or meaningful effort.
- If goals were difficult, normalize this and suggest **gentler, more realistic adjustments**.
- If habits or goals were helpful, briefly emphasise why.

EMOTIONS & JOURNAL
- Acknowledge emotional themes (low motivation, fatigue, hope, frustration, small victories).
- Reflect them briefly with care and grounded empathy.

RECOVERY-AWARE COACHING
Notice signs of **overdoing**:
- high exercise + poor sleep  
- consistently elevated stress  
- very low energy despite strong effort  
- journals describing exhaustion  
If so:
- encourage **rest**, softness, or lowering pressure  
- validate meaningful effort  
- suggest **nourishing, enjoyable** activities  

NEXT WEEK SUGGESTIONS
- Offer **2–3 tiny, concrete focuses** for next week.
- They may simplify or adjust existing goals.
- Avoid generic advice.

OPTIONAL REFLECTIVE QUESTION
In about half of all weeks, end with a very short question:
• “Which of these small focuses feels most supportive this week?”
• “What part of this resonates with your week?”
• “Is there one gentle next step that feels realistic?”
Use this only if it fits naturally.

OVERALL
- Be specific, kind, and emotionally intelligent.
- End with something connected to *this* week — no generic closers.


`.trim()

  const response = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'user',
        content: prompt
      }
    ]
  })

  const content =
    response.output?.[0]?.content?.[0]?.type === 'output_text'
      ? response.output[0].content[0].text
      : null

  if (!content) {
    return { summary: null }
  }

  // Guardar en ai_reports como weekly
  const { error: upsertError } = await supabase
    .from('ai_reports')
    .upsert(
      {
        user_id: user.sub,
        date: normalizedEnd,
        period: 'weekly',
        content
      },
      { onConflict: 'user_id,date,period' }
    )

  if (upsertError) {
    console.error('Failed to upsert weekly ai_report', upsertError)
  }

  return { summary: content }
})
