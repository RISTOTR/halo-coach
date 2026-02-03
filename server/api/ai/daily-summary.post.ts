// server/api/ai/daily-summary.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import OpenAI from 'openai'

const bodySchema = z.object({
  date: z.string() // YYYY-MM-DD
})

type MetricKey = 'sleep_hours' | 'mood' | 'stress' | 'energy'

function getWeekStartMonday(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  const day = d.getUTCDay() // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1) - day // move to Monday
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

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
function round1(n: number) {
  return Math.round(n * 10) / 10
}
function pickStrongestDelta(deltas: Record<MetricKey, number | null>) {
  const entries = Object.entries(deltas)
    .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => Math.abs((b[1] as number)) - Math.abs((a[1] as number)))

  if (!entries.length) return null
  return { key: entries[0][0] as MetricKey, value: entries[0][1] as number }
}
function formatMeasuredLine(args: { key: MetricKey; delta: number; modeLabel: string }) {
  const { key, delta, modeLabel } = args
  const abs = Math.abs(delta)
  const up = delta > 0

  if (key === 'stress') {
    const word = up ? 'higher' : 'lower'
    return `Compared to your ${modeLabel}, stress is ${word} by ${round1(abs)}.`
  }

  if (key === 'sleep_hours') {
    const word = up ? 'up' : 'down'
    return `Compared to your ${modeLabel}, sleep is ${word} by ${round1(abs)}h.`
  }

  const metricName = key === 'mood' ? 'mood' : 'energy'
  const word = up ? 'up' : 'down'
  return `Compared to your ${modeLabel}, ${metricName} is ${word} by ${round1(abs)}.`
}

function countNumeric(rows: any[], key: MetricKey) {
  return rows.filter((r) => typeof r?.[key] === 'number' && Number.isFinite(r[key])).length
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

  const { date } = bodySchema.parse(await readBody(event))

  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  // ✅ consistent uid
  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = await serverSupabaseClient(event)
  const client = new OpenAI({ apiKey: config.openaiApiKey })

  const normalizedDate = new Date(date).toISOString().slice(0, 10)

  const current = new Date(`${normalizedDate}T00:00:00.000Z`)
  current.setUTCDate(current.getUTCDate() - 1)
  const yesterdayDate = current.toISOString().slice(0, 10)

  const weekStart = getWeekStartMonday(normalizedDate)

  // -----------------------------
  // Weekly goals (context)
  // -----------------------------
  const { data: weeklyGoals, error: goalsError } = await supabase
    .from('weekly_goals')
    .select('id, title, status')
    .eq('user_id', uid)
    .eq('week_start', weekStart)
    .order('created_at', { ascending: true })

  if (goalsError) console.error(goalsError)

  // -----------------------------
  // 1) Daily metrics (today)
  // -----------------------------
  const { data: metrics, error: metricsError } = await supabase
    .from('daily_metrics')
    .select('*')
    .eq('user_id', uid)
    .eq('date', normalizedDate)
    .maybeSingle()

  if (metricsError) {
    console.error(metricsError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load daily metrics' })
  }

  if (!metrics) {
    return { summary: null }
  }

  // -----------------------------
  // 2) Yesterday metrics (optional)
  // -----------------------------
  const { data: yesterdayMetrics, error: yesterdayMetricsError } = await supabase
    .from('daily_metrics')
    .select('*')
    .eq('user_id', uid)
    .eq('date', yesterdayDate)
    .maybeSingle()

  if (yesterdayMetricsError) {
    console.error('Failed to load yesterday metrics', yesterdayMetricsError)
  }

  // -----------------------------
  // 3) Journal (today)
  // -----------------------------
  const { data: journalRows, error: journalError } = await supabase
    .from('journal_entries')
    .select('content, created_at')
    .eq('user_id', uid)
    .eq('date', normalizedDate)
    .eq('type', 'evening')
    .order('created_at', { ascending: false })
    .limit(1)

  if (journalError) console.error(journalError)

  const journalEntry = journalRows?.[0] ?? null

  // -----------------------------
  // 4) Journal (yesterday, optional)
  // -----------------------------
  const { data: yesterdayJournalRows, error: yesterdayJournalError } = await supabase
    .from('journal_entries')
    .select('content, created_at')
    .eq('user_id', uid)
    .eq('date', yesterdayDate)
    .eq('type', 'evening')
    .order('created_at', { ascending: false })
    .limit(1)

  if (yesterdayJournalError) console.error('Failed to load yesterday journal', yesterdayJournalError)

  const yesterdayJournalEntry = yesterdayJournalRows?.[0] ?? null

  // -----------------------------
  // 5) Habits + entries (Phase-1 consistency)
  // -----------------------------
  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id, name, frequency, target_per_week, archived')
    .eq('user_id', uid)
    .or('archived.is.null,archived.eq.false')

  if (habitsError) {
    console.error(habitsError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load habits' })
  }

  const { data: entries, error: entriesErr } = await supabase
    .from('habit_entries')
    .select('habit_id, completed')
    .eq('user_id', uid)
    .eq('date', normalizedDate)

  if (entriesErr) {
    console.error(entriesErr)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load habit entries' })
  }

  const completedIds = new Set((entries || []).filter((e: any) => e.completed !== false).map((e: any) => e.habit_id))
  const completedHabits = (habits || []).filter((h: any) => completedIds.has(h.id))
  const habitsStatus = `${completedHabits.length} of ${(habits || []).length} habits completed`

  const habitsList =
    completedHabits.map((h: any) => `- ${h.name} (${h.frequency})`).join('\n') ||
    'None completed today.'

  // -----------------------------
  // 6) Measured line (WoW delta)
  // -----------------------------
  const endD = new Date(`${normalizedDate}T00:00:00.000Z`)
  const start14 = daysAgoISO(13, endD)
  const start7 = daysAgoISO(6, endD)
  const prev7Start = daysAgoISO(13, endD)
  const prev7End = daysAgoISO(7, endD)

  const { data: metricRows, error: rangeErr } = await supabase
    .from('daily_metrics')
    .select('date,sleep_hours,mood,stress,energy')
    .eq('user_id', uid)
    .gte('date', start14)
    .lte('date', normalizedDate)
    .order('date', { ascending: true })

  if (rangeErr) {
    console.error(rangeErr)
    // don’t fail the whole reflection; just skip the measured line
  }

  let measuredLine: string | null = null
  if (!rangeErr) {
    const rows = metricRows || []
    const last7 = rows.filter((r: any) => r.date >= start7 && r.date <= normalizedDate)
    const prev7 = rows.filter((r: any) => r.date >= prev7Start && r.date <= prev7End)

    const deltasWoW = {
      sleep_hours: deltaMetric(last7, prev7, 'sleep_hours'),
      mood: deltaMetric(last7, prev7, 'mood'),
      stress: deltaMetric(last7, prev7, 'stress'),
      energy: deltaMetric(last7, prev7, 'energy')
    } satisfies Record<MetricKey, number | null>

    const hasWoW = Object.values(deltasWoW).some((v) => typeof v === 'number' && Number.isFinite(v))
    const MIN_SIGNAL = 0.3

    if (hasWoW) {
      const top = pickStrongestDelta(deltasWoW)
      if (top && Math.abs(top.value) >= MIN_SIGNAL) {
        measuredLine = formatMeasuredLine({ key: top.key, delta: top.value, modeLabel: 'previous 7 days' })
      }
    }
    const MIN_POINTS = 4

if (hasWoW) {
  const top = pickStrongestDelta(deltasWoW)
  if (top && Math.abs(top.value) >= MIN_SIGNAL) {
    const nLast = countNumeric(last7, top.key)
    const nPrev = countNumeric(prev7, top.key)

    if (nLast >= MIN_POINTS && nPrev >= MIN_POINTS) {
      measuredLine = formatMeasuredLine({
        key: top.key,
        delta: top.value,
        modeLabel: 'previous 7 days'
      })
    }
  }
}

  }

  // -----------------------------
  // Prompt building
  // -----------------------------
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
      const short = yesterdayJournalEntry.content.length > 220
        ? yesterdayJournalEntry.content.slice(0, 220) + '…'
        : yesterdayJournalEntry.content
      parts.push(`Yesterday's reflection (short excerpt): """${short}"""`)
    }
    yesterdayContextText = parts.join('\n')
  }

  const goalsText =
    weeklyGoals && weeklyGoals.length
      ? weeklyGoals
          .map((g: any) => `- ${g.title}${g.status ? ` (${g.status})` : ''}`)
          .join('\n')
      : 'No weekly goals set.'

  const prompt = `
You are Halo, a calm, encouraging health coach.
Your job is to give the user a short, human, motivating reflection of their day and 1–2 gentle focus points for tomorrow.

Data you have:
- Date: ${normalizedDate}
- Week anchor (Monday): ${weekStart}

- Core metrics:
${metricsText}

- Journal / reflection:
${journalText}

- Habits:
${habitsText}

- Weekly goals (context for this week):
${goalsText}

- Optional context from yesterday (use only if it genuinely helps):
${yesterdayContextText}

Important:
- DO NOT include numeric comparisons vs prior weeks (Halo will add one data-backed line separately).
- Do not list every metric or every number. Turn them into ideas.

Guidelines:
- Write in a warm, grounded tone. Imagine you talk to a thoughtful adult, not a child.
- Start with 1–2 positive highlights from today (effort, coping, recovery, a habit, or something in the reflection).
- If the journal entry mentions emotions, struggles or wins, acknowledge them briefly and kindly.

GOALS INTEGRATION (important):
- Weekly goals are context, not a checklist.
- Mention at most ONE weekly goal (or goal theme) if it naturally supports the user today.
- If goals feel too ambitious for the user’s energy/sleep/stress, gently suggest shrinking the goal (smaller and kinder).
- If the user already did something aligned with a goal today, acknowledge it as a small win.

RECOVERY-AWARE:
- If the user seems tired / stressed / slept poorly, avoid pushing them to do more.
- In those cases suggest rest, lowering pressure, or one small nourishing action they genuinely enjoy.

FORMATTING (Markdown):
- Use **bold** 1–3 times to highlight key levers (a habit name, a goal theme, “rest & recovery”).
- Use *italics* 0–2 times for emotional nuance (e.g. *low motivation*, *quiet hope*).
- Keep bold spans short (2–6 words). Do not bold numbers.

- Then give 1–2 concrete, realistic suggestions for tomorrow. Think tiny steps.
- Keep it under 180 words.
- 2–3 short paragraphs. No bullet points.
- Avoid generic phrases like "great foundation" or "wonderful for body and mind". Be specific.
`.trim()

  const response = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: [{ role: 'user', content: prompt }]
  })

  const content =
    response.output?.[0]?.content?.[0]?.type === 'output_text'
      ? response.output[0].content[0].text
      : null

  let finalContent = content
  if (content && measuredLine) {
    finalContent = `${content}\n\n—\n${measuredLine}`
  }

  if (finalContent) {
    const { error: upsertError } = await supabase
      .from('ai_reports')
      .upsert(
        {
          user_id: uid,
          date: normalizedDate,
          period: 'daily',
          content: finalContent
        },
        { onConflict: 'user_id,date,period' }
      )

    if (upsertError) console.error(upsertError)
  }

  return { summary: finalContent }
})
