// server/api/ai/daily-summary.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import OpenAI from 'openai'

const bodySchema = z.object({
  date: z.string() // YYYY-MM-DD
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  if (!config.openaiApiKey) {
    console.error('OPENAI_API_KEY is not set')
    throw createError({
      statusCode: 500,
      statusMessage: 'OPENAI_API_KEY is not configured.'
    })
  }

  const { date } = bodySchema.parse(await readBody(event))

  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = await serverSupabaseClient(event)
  const client = new OpenAI({ apiKey: config.openaiApiKey })

  const normalizedDate = new Date(date).toISOString().slice(0, 10)

  const current = new Date(normalizedDate)
  current.setDate(current.getDate() - 1)
  const yesterdayDate = current.toISOString().slice(0, 10)


  // 1) Daily metrics
  const { data: metrics, error: metricsError } = await supabase
    .from('daily_metrics')
    .select('*')
    .eq('user_id', user.sub) // asegúrate de que en daily_metrics también guardas user.sub
    .eq('date', normalizedDate)
    .maybeSingle()

  if (metricsError) {
    console.error(metricsError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load daily metrics' })
  }

  if (!metrics) {
    // Sin métricas no tiene mucho sentido generar resumen
    return { content: null }
  }

  // 2) Daily metrics AYER (opcional, no aborta si falta)
const { data: yesterdayMetrics, error: yesterdayMetricsError } = await supabase
  .from('daily_metrics')
  .select('*')
  .eq('user_id', user.sub)
  .eq('date', yesterdayDate)
  .maybeSingle()

if (yesterdayMetricsError) {
  console.error('Failed to load yesterday metrics', yesterdayMetricsError)
  // no devolvemos error, simplemente no habrá contexto de ayer
}

  // 3) Journal entries (última reflexión "evening" del día)
  const { data: journalRows, error: journalError } = await supabase
    .from('journal_entries')
    .select('content, created_at')
    .eq('user_id', user.sub)
    .eq('date', normalizedDate)
    .eq('type', 'evening')
    .order('created_at', { ascending: false })
    .limit(1)

  if (journalError) {
    console.error(journalError)
    // pero no abortamos, simplemente seguimos sin journal
  }

  const journalEntry = journalRows?.[0] ?? null

  // 4) Journal AYER (nuevo, también opcional)
const { data: yesterdayJournalRows, error: yesterdayJournalError } = await supabase
  .from('journal_entries')
  .select('content, created_at')
  .eq('user_id', user.sub)
  .eq('date', yesterdayDate)
  .eq('type', 'evening')
  .order('created_at', { ascending: false })
  .limit(1)

if (yesterdayJournalError) {
  console.error('Failed to load yesterday journal', yesterdayJournalError)
}

const yesterdayJournalEntry = yesterdayJournalRows?.[0] ?? null


  // 5) Habits + logs
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
    .select('habit_id, completed')
    .eq('user_id', user.sub)
    .eq('date', normalizedDate)

  if (logsError) {
    console.error(logsError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load habit logs' })
  }

  const completedIds = new Set((logs || []).filter((l) => l.completed).map((l) => l.habit_id))
  const completedHabits = (habits || []).filter((h) => completedIds.has(h.id))
  const habitsStatus = `${completedHabits.length} of ${(habits || []).length} habits completed`

  const habitsList =
    completedHabits.map((h) => `- ${h.name} (${h.frequency})`).join('\n') ||
    'None completed today.'

  // 4) Texto base para la IA
  const metricsText = `
sleep_hours: ${metrics.sleep_hours ?? 'null'}
mood (1-5): ${metrics.mood ?? 'null'}
energy (1-5): ${metrics.energy ?? 'null'}
stress (1-5): ${metrics.stress ?? 'null'}
water_liters: ${metrics.water_liters ?? 'null'}
movement_minutes: ${metrics.steps ?? 'null'}
outdoor_minutes: ${metrics.outdoor_minutes ?? 'null'}
`.trim()


  const habitsText = `
Habit progress today: ${habitsStatus}
Completed habits:
${habitsList}
`.trim()

const journalText = journalEntry?.content
  ? `User reflection for today:\n"""${journalEntry.content}"""`
  : 'User did not write a reflection today.'

let yesterdayContextText = 'No specific context from yesterday.'

if (yesterdayMetrics || yesterdayJournalEntry) {
  const parts: string[] = []

  if (yesterdayMetrics) {
    parts.push(
      `Yesterday metrics (high-level): sleep_hours=${yesterdayMetrics.sleep_hours ?? 'null'}, mood=${yesterdayMetrics.mood ?? 'null'}, energy=${yesterdayMetrics.energy ?? 'null'}, stress=${yesterdayMetrics.stress ?? 'null'}.`
    )
  }

  if (yesterdayJournalEntry?.content) {
    parts.push(
      `Yesterday's reflection (short excerpt): """${yesterdayJournalEntry.content}"""`
    )
  }

  yesterdayContextText = parts.join('\n')
}

const prompt = `
You are Halo, a calm, encouraging health coach.
Your job is to give the user a short, human, motivating summary of their day and 1–2 gentle focus points for tomorrow.

Data you have:
- Date: ${normalizedDate}
- Core metrics today:
${metricsText}

- Journal / reflection today:
${journalText}

- Brief context from yesterday (if available):
${yesterdayContextText}

- Habits today:
${habitsText}

Guidelines:
- Write in a warm, grounded tone. Imagine you talk to a thoughtful adult, not a child.
- DO NOT list every metric or every number. Turn them into ideas.
- Do NOT always start with sleep. Choose the most relevant or emotionally meaningful element (sleep, stress, habits, or something from the reflection) as the first highlight.
- Start with 1–2 positive highlights from today (sleep, movement, habits, coping with stress, or something they wrote in their reflection).
- If yesterday’s context shows effort or progress that contrasts with today (for example: yesterday they pushed themselves a lot and today they are tired), you may briefly acknowledge that pattern.
- If the journal entry mentions emotions, struggles or wins, acknowledge them briefly and kindly.
- Then give 1–2 concrete, realistic suggestions for tomorrow. Think in tiny steps (e.g., "add one short walk", "protect 10–15 minutes for calm", "one extra glass of water").
- If the day was already very strong in all metrics, focus on maintenance and self-kindness instead of pushing harder.
- Keep it under 180 words.
- Do not use bullet points; 2–3 short paragraphs are enough.
- Avoid generic phrases like "great foundation" or "wonderful for body and mind". Be a bit more specific.
- You may echo a short idea from the reflection, but paraphrase it instead of quoting it literally.
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

  if (content) {
    const { error: upsertError } = await supabase
      .from('ai_reports')
      .upsert(
        {
          user_id: user.sub,
          date: normalizedDate,
          period: 'daily',
          content
        },
        { onConflict: 'user_id,date,period' }
      )

    if (upsertError) {
      console.error(upsertError)
      // no rompemos la respuesta al cliente, ya tenemos content generado
    }
  }

  return { summary: content }

})
