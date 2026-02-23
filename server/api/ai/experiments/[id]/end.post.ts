// server/api/ai/experiments/[id]/end.post.ts
import { defineEventHandler, createError, readBody } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const bodySchema = z.object({
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
})

type MetricKey = 'sleep_hours' | 'mood' | 'stress' | 'energy'
type DirectionGood = 'up' | 'down'

const CORE_KEYS: MetricKey[] = ['sleep_hours', 'mood', 'stress', 'energy']

function isUUID(v: string) {
  return /^[0-9a-fA-F-]{36}$/.test(v)
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return isoDate(d)
}

function diffDaysInclusive(start: string, end: string) {
  const a = new Date(`${start}T00:00:00.000Z`).getTime()
  const b = new Date(`${end}T00:00:00.000Z`).getTime()
  const diff = Math.floor((b - a) / (1000 * 60 * 60 * 24))
  return Math.max(1, diff + 1)
}

function avg(nums: number[]) {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function avgMetric(rows: any[], key: string) {
  return avg(
    rows
      .map((r) => r?.[key])
      .filter((v: any): v is number => typeof v === 'number' && Number.isFinite(v))
  )
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function countNumeric(rows: any[], key: string) {
  return rows.filter((r) => typeof r?.[key] === 'number' && Number.isFinite(r[key])).length
}

function directionGoodFor(metric: string): DirectionGood {
  // Extend later as you add more metrics. For now:
  if (metric === 'stress') return 'down'
  return 'up'
}

function alignmentFromDelta(delta: number | null, good: DirectionGood) {
  if (typeof delta !== 'number' || !Number.isFinite(delta)) return 'unclear'
  const MIN_SIGNAL = 0.2 // slightly sensitive; adjust as you like
  if (Math.abs(delta) < MIN_SIGNAL) return 'unclear'
  const improved = good === 'down' ? delta < 0 : delta > 0
  return improved ? 'aligned' : 'mismatch'
}

function confidenceScore(opts: { nBase: number; nExp: number; deltaAbs: number | null }) {
  // Simple + stable: data coverage first, then effect size
  const { nBase, nExp, deltaAbs } = opts
  const MIN_POINTS = 4

  if (nBase < MIN_POINTS || nExp < MIN_POINTS) return 0.25
  if (typeof deltaAbs !== 'number' || !Number.isFinite(deltaAbs)) return 0.35
  if (deltaAbs >= 0.6) return 0.8
  if (deltaAbs >= 0.3) return 0.65
  return 0.5
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const id = String(event.context.params?.id || '')
  if (!isUUID(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid experiment id' })

  const supabase = await serverSupabaseClient(event)

  const { endDate } = bodySchema.parse(await readBody(event).catch(() => ({})))
  const end_date = endDate ?? new Date().toISOString().slice(0, 10)

  const { data: exp, error: expErr } = await supabase
    .from('experiments')
    .select('id,user_id,status,start_date,end_date,title,lever_ref,target_metric,baseline_days,recommended_days,confidence')
    .eq('id', id)
    .eq('user_id', uid)
    .maybeSingle()

  if (expErr) throw createError({ statusCode: 500, statusMessage: expErr.message })
  if (!exp) throw createError({ statusCode: 404, statusMessage: 'Experiment not found' })

  // Idempotent: already ended => no recompute
  if (exp.end_date) {
    return { success: true, alreadyEnded: true, experiment: exp }
  }

  if (exp.status !== 'active') {
    throw createError({ statusCode: 409, statusMessage: `Cannot end experiment in status=${exp.status}` })
  }

  if (!exp.start_date) {
    throw createError({ statusCode: 409, statusMessage: 'Experiment missing start_date' })
  }

  // -----------------------------
  // Define windows
  // -----------------------------
  const baselineDays = Number(exp.baseline_days ?? 7)
  const baselineEnd = addDays(exp.start_date, -1)
  const baselineStart = addDays(exp.start_date, -baselineDays)

  const expStart = exp.start_date
  const expEnd = end_date

  const expDaysActual = diffDaysInclusive(expStart, expEnd)

  // -----------------------------
  // Load daily_metrics for both windows
  // -----------------------------
  const keysToSelect = Array.from(new Set([...CORE_KEYS, String(exp.target_metric || '')].filter(Boolean)))
  const selectCols = ['date', ...keysToSelect].join(',')

  const [{ data: baseRows, error: baseErr }, { data: expRows, error: expRowsErr }] = await Promise.all([
    supabase
      .from('daily_metrics')
      .select(selectCols)
      .eq('user_id', uid)
      .gte('date', baselineStart)
      .lte('date', baselineEnd)
      .order('date', { ascending: true }),

    supabase
      .from('daily_metrics')
      .select(selectCols)
      .eq('user_id', uid)
      .gte('date', expStart)
      .lte('date', expEnd)
      .order('date', { ascending: true })
  ])

  // If metrics queries fail, we can still end the experiment, but outcome will be partial.
  if (baseErr) console.error('baseline metrics error', baseErr)
  if (expRowsErr) console.error('experiment metrics error', expRowsErr)

  const baseline = baseRows || []
  const during = expRows || []

  // -----------------------------
  // Build outcome snapshot
  // -----------------------------
  const metricsOutcome: Record<
    string,
    { baseline: number | null; experiment: number | null; delta: number | null; direction_good: DirectionGood; n_baseline: number; n_experiment: number }
  > = {}

  for (const key of keysToSelect) {
    const baseAvg = avgMetric(baseline, key)
    const expAvg = avgMetric(during, key)
    const delta = baseAvg == null || expAvg == null ? null : expAvg - baseAvg

    metricsOutcome[key] = {
      baseline: baseAvg == null ? null : round1(baseAvg),
      experiment: expAvg == null ? null : round1(expAvg),
      delta: delta == null ? null : round1(delta),
      direction_good: directionGoodFor(key),
      n_baseline: countNumeric(baseline, key),
      n_experiment: countNumeric(during, key)
    }
  }

  const targetKey = String(exp.target_metric || 'stress')
  const targetEntry = metricsOutcome[targetKey]
  const targetDeltaAbs = targetEntry?.delta == null ? null : Math.abs(targetEntry.delta)

  const alignment = alignmentFromDelta(targetEntry?.delta ?? null, directionGoodFor(targetKey))
  const confScore = confidenceScore({
    nBase: targetEntry?.n_baseline ?? 0,
    nExp: targetEntry?.n_experiment ?? 0,
    deltaAbs: targetDeltaAbs
  })

  const outcome = {
    alignment, // 'aligned' | 'mismatch' | 'unclear'
    confidence_score: confScore,
    baseline_days: baselineDays,
    experiment_days: expDaysActual,
    windows: {
      baseline: { start: baselineStart, end: baselineEnd },
      experiment: { start: expStart, end: expEnd }
    },
    lever_ref: exp.lever_ref ?? null,
    target_metric: targetKey,
    metrics: metricsOutcome,
    // keep these empty for now; your review screen can fill later (or an AI endpoint can)
    what_worked: [] as string[],
    try_next: [] as string[]
  }

  // -----------------------------
  // Persist end + outcome snapshot
  // -----------------------------
  const { data: updated, error: updErr } = await supabase
    .from('experiments')
    .update({
      end_date,
      status: 'ended_pending_review',
      outcome,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', uid)
    .select('*')
    .single()

  if (updErr) throw createError({ statusCode: 500, statusMessage: updErr.message })


  try {
    await supabase.from('experiment_events').insert({
      user_id: uid,
      experiment_id: id,
      type: 'ended',
      payload: { end_date, alignment, confidence_score: confScore }
    })
  } catch (e) {
    console.error('experiment_events insert failed (ignored)', e)
  }

  try {
    const { error: upsertErr } = await supabase.rpc('upsert_experiment_effects_v1', {
      p_experiment_id: id,
      p_method_version: 1
    })

    if (upsertErr) console.error('experiment_effects upsert failed (ignored)', upsertErr)
  } catch (e) {
    console.error('experiment_effects upsert failed (ignored)', e)
  }

  return { success: true, alreadyEnded: false, experiment: updated }
})
