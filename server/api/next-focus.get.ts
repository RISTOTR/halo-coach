// server/api/next-focus.get.ts
import { defineEventHandler, getQuery, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import OpenAI from 'openai'

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
})

type MetricKey = 'sleep_hours' | 'mood' | 'stress' | 'energy'
type TargetMetric =
  | 'energy'
  | 'stress'
  | 'mood'
  | 'sleep_hours'
  | 'steps'
  | 'water_liters'
  | 'outdoor_minutes'
type Effort = 'low' | 'moderate' | 'high'
type Impact = 'low' | 'moderate' | 'high'

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

type NextFocusOption = {
  id: string
  title: string
  why: string
  effort: Effort
  impact: Impact
  preset: Preset | null
}

// --- AI output schema (STRICT + exactly 2 options)
const aiOutSchema = z.object({
  options: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        title: z.string().min(1).max(90),
        why: z.string().min(1).max(260),
        effort: z.enum(['low', 'moderate', 'high']),
        impact: z.enum(['low', 'moderate', 'high']),
        preset: z
          .object({
            title: z.string().min(1).max(90),
            leverType: z.enum(['metric', 'habit', 'custom']),
            leverRef: z.string().optional(),
            targetMetric: z.enum([
              'energy',
              'stress',
              'mood',
              'sleep_hours',
              'steps',
              'water_liters',
              'outdoor_minutes'
            ]),
            effortEstimate: z.enum(['low', 'moderate', 'high']).optional(),
            expectedImpact: z.enum(['low', 'moderate', 'high']).optional(),
            recommendedDays: z.number().int().min(3).max(60).optional(),
            baselineDays: z.number().int().min(7).max(90).optional()
          })
          .nullable()
      })
    )
    .length(2)
})

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}
function daysAgoISO(n: number, from = new Date()) {
  const d = new Date(from)
  d.setDate(d.getDate() - n)
  return isoDate(d)
}

function mean(nums: number[]) {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}
function stddev(nums: number[]) {
  if (nums.length < 2) return null
  const m = mean(nums)
  if (m == null) return null
  const v = nums.reduce((acc, x) => acc + (x - m) ** 2, 0) / (nums.length - 1)
  return Math.sqrt(v)
}
function values(rows: any[], key: MetricKey) {
  return rows
    .map((r) => r?.[key])
    .filter((v: any): v is number => typeof v === 'number' && Number.isFinite(v))
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}
function scoreSignal(n: number, threshold: number) {
  const a = Math.abs(n)
  if (a >= threshold * 2) return 3
  if (a >= threshold * 1.25) return 2
  if (a >= threshold) return 1
  return 0
}

function buildDeterministicOptions(checkinRows: any[]): NextFocusOption[] {
  // Use checkinRows for signals
  const sleep = values(checkinRows, 'sleep_hours')
  const mood = values(checkinRows, 'mood')
  const stress = values(checkinRows, 'stress')
  const energy = values(checkinRows, 'energy')

  const sleepSd = sleep.length >= 3 ? stddev(sleep) : null
  const stressAvg = mean(stress)
  const energyAvg = mean(energy)
  const moodAvg = mean(mood)

  const sleepVarianceScore = sleepSd == null ? 0 : scoreSignal(sleepSd, 0.9)
  const stressHighScore = stressAvg == null ? 0 : scoreSignal(stressAvg - 3.3, 0.6)
  const energyLowScore = energyAvg == null ? 0 : scoreSignal(3.2 - energyAvg, 0.5)
  const moodLowScore = moodAvg == null ? 0 : scoreSignal(3.2 - moodAvg, 0.5)

  const candidates: Array<NextFocusOption & { score: number }> = []

  // Sleep consistency
  if ((sleep.length >= 3 || energy.length >= 3) && (sleepVarianceScore > 0 || energyLowScore > 0)) {
    const why =
      sleepVarianceScore > 0
        ? 'Your sleep looks a bit uneven this week — smoothing it often helps energy and steadiness.'
        : 'Energy dipped this week; protecting sleep is usually the best first lever.'

    candidates.push({
      id: 'sleep_consistency',
      title: 'Sleep consistency',
      why,
      effort: 'low',
      impact: 'high',
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
      score: clamp(sleepVarianceScore * 2 + energyLowScore * 2, 0, 10)
    })
  }

  // Outdoor reset
  if ((stress.length >= 3 || mood.length >= 3) && (stressHighScore > 0 || moodLowScore > 0)) {
    const why =
      stressHighScore > 0
        ? 'Stress looks elevated — a short daily reset outside can help prevent stress from accumulating.'
        : 'Mood looks a bit low; light + air is a gentle lever that’s easy to sustain.'

    candidates.push({
      id: 'outdoor_reset',
      title: 'Get light + air daily',
      why,
      effort: 'low',
      impact: 'moderate',
      preset: {
        title: 'Get light + air daily',
        leverType: 'metric',
        leverRef: 'outdoor_minutes',
        targetMetric: 'stress',
        effortEstimate: 'low',
        expectedImpact: 'moderate',
        recommendedDays: 7,
        baselineDays: 30
      },
      score: clamp(stressHighScore * 2 + moodLowScore, 0, 10)
    })
  }

  // One strong block
  if (energyAvg != null && stressAvg != null && energyAvg >= 3.6 && stressAvg <= 3.2) {
    candidates.push({
      id: 'one_block',
      title: 'One meaningful 20-minute block',
      why: 'When energy is reasonably steady, a single focused block can create momentum without overloading the day.',
      effort: 'moderate',
      impact: 'high',
      preset: null,
      score: 2
    })
  }

  // If nothing triggered, seed a safe default
  if (!candidates.length) {
    candidates.push({
      id: 'outdoor_reset',
      title: 'Get light + air daily',
      why: 'You have a few check-ins — keep it simple this week. Light + air is a low-effort reset that tends to help stress and mood.',
      effort: 'low',
      impact: 'moderate',
      preset: {
        title: 'Get light + air daily',
        leverType: 'metric',
        leverRef: 'outdoor_minutes',
        targetMetric: 'stress',
        effortEstimate: 'low',
        expectedImpact: 'moderate',
        recommendedDays: 7,
        baselineDays: 30
      },
      score: 1
    })
  }

  // Sort best-first
  candidates.sort((a, b) => b.score - a.score)

  // Always return exactly 2 options (for dashboard subtitle promise)
  const lowEffort = candidates.find((c) => c.effort === 'low') || candidates[0]
  const rest = candidates.filter((c) => c.id !== lowEffort?.id)
  const highImpact = rest.find((c) => c.impact === 'high') || rest[0] || null

  const options: NextFocusOption[] = []
  if (lowEffort) options.push(lowEffort)

  // If we still don't have a second, add a deterministic “universal” second option
  if (highImpact) {
    options.push(highImpact)
  } else {
    options.push({
      id: 'hydration_baseline',
      title: 'Hydration baseline',
      why: 'A simple hydration baseline can improve steadiness with very low friction — good when the signal is noisy.',
      effort: 'low',
      impact: 'moderate',
      preset: {
        title: 'Hydration baseline',
        leverType: 'metric',
        leverRef: 'water_liters',
        targetMetric: 'energy',
        effortEstimate: 'low',
        expectedImpact: 'moderate',
        recommendedDays: 7,
        baselineDays: 30
      }
    })
  }

  // Ensure exactly 2 and distinct ids
  const dedup: NextFocusOption[] = []
  for (const o of options) {
    if (!dedup.find((x) => x.id === o.id)) dedup.push(o)
    if (dedup.length === 2) break
  }

  // still 1? add a final safe “sleep” option
  if (dedup.length < 2) {
    dedup.push({
      id: 'sleep_consistency_fallback',
      title: 'Sleep consistency',
      why: 'Even a small consistency tweak (same wake time) often improves energy and mood over a week.',
      effort: 'low',
      impact: 'high',
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
    })
  }

  return dedup.slice(0, 2)
}

function optionLeverKey(o: NextFocusOption) {
  // Use leverRef when present; otherwise treat as a unique "custom" key per id
  return (o.preset?.leverRef && o.preset.leverRef.trim()) ? `lever:${o.preset.leverRef.trim()}` : `custom:${o.id}`
}

function avoidActiveAndEnsureTwo(
  options: NextFocusOption[],
  activeLeverRef?: string | null
): NextFocusOption[] {
  const activeRef = (activeLeverRef || '').trim()

  // 1) Filter out same leverRef as active experiment
  let filtered = options
  if (activeRef) {
    filtered = filtered.filter((o) => (o.preset?.leverRef || '').trim() !== activeRef)
  }

  // 2) Safe pool (fallback fillers)
  const safePool: NextFocusOption[] = [
    {
      id: 'sleep_consistency_fallback',
      title: 'Sleep consistency',
      why: 'Even a small consistency tweak (same wake time) often improves energy and steadiness.',
      effort: 'low',
      impact: 'high',
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
    },
    {
      id: 'hydration_baseline',
      title: 'Hydration baseline',
      why: 'A simple hydration baseline improves steadiness with very low friction.',
      effort: 'low',
      impact: 'moderate',
      preset: {
        title: 'Hydration baseline',
        leverType: 'metric',
        leverRef: 'water_liters',
        targetMetric: 'energy',
        effortEstimate: 'low',
        expectedImpact: 'moderate',
        recommendedDays: 7,
        baselineDays: 30
      }
    },
    {
      id: 'steps_reset',
      title: 'Easy movement reset',
      why: 'A short daily walk is an easy lever that supports mood and stress without much planning.',
      effort: 'low',
      impact: 'moderate',
      preset: {
        title: 'Easy movement reset',
        leverType: 'metric',
        leverRef: 'steps',
        targetMetric: 'mood',
        effortEstimate: 'low',
        expectedImpact: 'moderate',
        recommendedDays: 7,
        baselineDays: 30
      }
    },
    {
      id: 'outdoor_reset',
      title: 'Get light + air daily',
      why: 'Light + air is a low-effort reset that tends to help stress and mood.',
      effort: 'low',
      impact: 'moderate',
      preset: {
        title: 'Get light + air daily',
        leverType: 'metric',
        leverRef: 'outdoor_minutes',
        targetMetric: 'stress',
        effortEstimate: 'low',
        expectedImpact: 'moderate',
        recommendedDays: 7,
        baselineDays: 30
      }
    },
    // Optional: a non-preset "custom" option if you want variety:
    {
      id: 'one_block',
      title: 'One meaningful 20-minute block',
      why: 'A single focused block can create momentum without overloading the day.',
      effort: 'moderate',
      impact: 'high',
      preset: null
    }
  ]

  const pool = activeRef
    ? safePool.filter((o) => (o.preset?.leverRef || '').trim() !== activeRef)
    : safePool

  // 3) Build exactly 2 options, enforcing distinct lever keys
  const out: NextFocusOption[] = []
  const usedIds = new Set<string>()
  const usedLeverKeys = new Set<string>()

  function tryAdd(o: NextFocusOption) {
    if (out.length >= 2) return
    if (usedIds.has(o.id)) return
    const lk = optionLeverKey(o)
    if (usedLeverKeys.has(lk)) return
    // Also ensure it doesn't conflict with active lever (extra safety)
    if (activeRef && (o.preset?.leverRef || '').trim() === activeRef) return

    out.push(o)
    usedIds.add(o.id)
    usedLeverKeys.add(lk)
  }

  // Prefer the provided options first
  for (const o of filtered) tryAdd(o)

  // Fill from pool if needed
  for (const o of pool) tryAdd(o)

  // If still short (edge case), relax leverKey uniqueness for custom-only options
  // but still avoid activeRef and duplicate ids.
  if (out.length < 2) {
    for (const o of pool) {
      if (out.length >= 2) break
      if (usedIds.has(o.id)) continue
      if (activeRef && (o.preset?.leverRef || '').trim() === activeRef) continue
      // allow same leverKey ONLY if preset is null (custom)
      if (o.preset?.leverRef) continue
      out.push(o)
      usedIds.add(o.id)
      usedLeverKeys.add(optionLeverKey(o))
    }
  }

  // Absolute last-resort: guarantee length 2 (should almost never happen)
  while (out.length < 2) {
    out.push({
      id: `fallback_${out.length + 1}`,
      title: 'Tiny reset',
      why: 'Keep it simple today — a small, repeatable action builds consistency.',
      effort: 'low',
      impact: 'moderate',
      preset: null
    })
  }

  return out.slice(0, 2)
}


export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = await serverSupabaseClient(event)
  const { date } = querySchema.parse(getQuery(event))

  const end = date ? new Date(date) : new Date()
  const endISO = isoDate(end)
  const startISO = daysAgoISO(6, end) // last 7 days inclusive

    // Active experiment (to avoid suggesting the same lever)
  const { data: activeExp, error: activeErr } = await supabase
    .from('experiments')
    .select('id, lever_ref, lever_type, target_metric, start_date, end_date, status, title')
    .eq('user_id', uid)
    .eq('status', 'active')
    .is('end_date', null)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (activeErr) {
    // don’t fail next-focus if this fails; just treat as no active exp
    console.warn('next-focus active experiment lookup failed:', activeErr.message)
  }

  const activeLeverRef = (activeExp?.lever_ref || '').toString()


  const { data: metricsRows, error: mErr } = await supabase
    .from('daily_metrics')
    .select('date,sleep_hours,mood,stress,energy')
    .eq('user_id', uid)
    .gte('date', startISO)
    .lte('date', endISO)
    .order('date', { ascending: true })

  if (mErr) throw createError({ statusCode: 500, statusMessage: mErr.message })

  const rows = metricsRows || []

  // Count only rows that contain at least ONE numeric core metric
  const checkinRows = rows.filter((r) =>
    ['sleep_hours', 'mood', 'stress', 'energy'].some(
      (k) => typeof (r as any)?.[k] === 'number' && Number.isFinite((r as any)?.[k])
    )
  )
  const checkins = checkinRows.length

 if (checkins < 3) {
  const fallback2 = avoidActiveAndEnsureTwo(buildDeterministicOptions([]), activeLeverRef)
  return { period: { start: startISO, end: endISO, checkins }, options: fallback2 }
}

  const fallback2 = avoidActiveAndEnsureTwo(
    buildDeterministicOptions(checkinRows),
    activeLeverRef
  )


  // Try AI (if key exists). If not, use fallback.
  const config = useRuntimeConfig(event)
  if (!config.openaiApiKey) {
    return { period: { start: startISO, end: endISO, checkins }, options: fallback2 }
  }

  const client = new OpenAI({ apiKey: config.openaiApiKey })

  // Light summary (no raw dumps, no per-day numbers)
  const sleep = values(checkinRows, 'sleep_hours')
  const mood = values(checkinRows, 'mood')
  const stress = values(checkinRows, 'stress')
  const energy = values(checkinRows, 'energy')

  const summary = {
    period: { start: startISO, end: endISO, checkins },
    averages: {
      sleep_hours: mean(sleep),
      mood: mean(mood),
      stress: mean(stress),
      energy: mean(energy)
    },
    variability: {
      sleep_hours_sd: sleep.length >= 3 ? stddev(sleep) : null
    },
    lastDay: checkinRows[checkinRows.length - 1]?.date || endISO
  }

    const activeContext = activeLeverRef
    ? `Active experiment leverRef (DO NOT suggest this leverRef in any preset): ${activeLeverRef}`
    : `No active experiment.`

  const prompt = `
Return STRICT JSON ONLY. No markdown, no prose outside JSON.

You generate "Next focus" options for a health tracker.
You MUST return exactly TWO options.

Rules:
- Option A = lower effort.
- Option B = higher impact (if plausible) and must be DIFFERENT from A.
- MUST NOT return a preset whose leverRef equals "${activeLeverRef}" if active exists.
- If both options include a preset, preset.leverRef MUST be different between Option A and Option B.
- If you accidentally include the active leverRef, replace it with another safe leverRef.
- Keep "why" concrete and short.
- Do NOT mention raw numeric values.
- If you suggest a metric lever, leverRef MUST be one of:
  sleep_hours, outdoor_minutes, water_liters, steps
- targetMetric MUST be one of:
  energy, stress, mood, sleep_hours, steps, water_liters, outdoor_minutes
- If data is sparse/holiday gaps, still output TWO safe defaults.

Schema:
{
  "options": [
    {
      "id": "string",
      "title": "string",
      "why": "string",
      "effort": "low|moderate|high",
      "impact": "low|moderate|high",
      "preset": {
        "title": "string",
        "leverType": "metric|habit|custom",
        "leverRef": "string?",
        "targetMetric": "energy|stress|mood|sleep_hours|steps|water_liters|outdoor_minutes",
        "effortEstimate": "low|moderate|high?",
        "expectedImpact": "low|moderate|high?",
        "recommendedDays": 7,
        "baselineDays": 30
      } | null
    },
    { ...second option... }
  ]
}

${activeContext}

Context (7-day summary):
${JSON.stringify(summary)}

If unsure, use these safe patterns:
- Sleep consistency (leverRef sleep_hours -> targetMetric energy)
- Light + air daily (leverRef outdoor_minutes -> targetMetric stress)
- Hydration baseline (leverRef water_liters -> targetMetric energy)
`.trim()

  try {
    const response = await client.responses.create({
      model: 'gpt-4.1-mini',
      input: [{ role: 'user', content: prompt }]
    })

    const text =
      response.output?.[0]?.content?.[0]?.type === 'output_text'
        ? response.output[0].content[0].text
        : null

    let parsed: unknown = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      parsed = null
    }

    const validated = aiOutSchema.safeParse(parsed)
    if (!validated.success) {
      return { period: { start: startISO, end: endISO, checkins }, options: fallback2 }
    }

    const aiOptionsRaw = validated.data.options as NextFocusOption[]
    const aiOptions = avoidActiveAndEnsureTwo(aiOptionsRaw, activeLeverRef)

    return {
      period: { start: startISO, end: endISO, checkins },
      options: aiOptions
    }

  } catch (e) {
    // any OpenAI/network error → fallback
    return { period: { start: startISO, end: endISO, checkins }, options: fallback2 }
  }
})
