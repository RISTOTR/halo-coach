// server/api/ai/experiments/[id]/review.get.ts
import { defineEventHandler, createError } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

type ReviewAlignment = 'aligned' | 'mismatch' | 'unclear'
type ExperimentStatus = 'active' | 'ended_pending_review' | 'completed' | 'abandoned'
type DirectionGood = 'up' | 'down'

type ReviewMetricDTO = {
  key: string
  label: string
  unit?: string
  directionGood: DirectionGood
  baselineAvg: number | null
  experimentAvg: number | null
  delta: number | null
  deltaText: string
  isSignal: boolean
  isImprovement: boolean | null
}

type ExperimentReviewDTO = {
  id: string
  title: string | null
  leverRef: string
  leverLabel: string
  targetMetric: string
  targetLabel: string

  status: ExperimentStatus
  dateRange: { start: string; end: string | null }

  windows: {
    baseline: { start: string; end: string; days: number }
    experiment: { start: string; end: string | null; days: number }
  }

  outcome: {
    alignment: ReviewAlignment
    confidenceScore: number
    confidenceLabel: 'low' | 'medium' | 'high'
    summaryPill: { tone: 'good' | 'bad' | 'neutral'; text: string }
  }

  conclusion: string | null

  metrics: {
    target: ReviewMetricDTO
    others: ReviewMetricDTO[]
  }

  notes: {
    whatWorked: string[]
    tryNext: string[]
  }
}

function isUUID(v: string) {
  return /^[0-9a-fA-F-]{36}$/.test(v)
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function formatDelta(delta: number | null, unit?: string) {
  if (delta == null || !Number.isFinite(delta)) return '—'
  const v = round1(delta)
  const sign = v > 0 ? '+' : '' // negative includes its own sign
  const u = unit ?? ''
  return `${sign}${v}${u}`
}

function directionGoodFor(metric: string): DirectionGood {
  if (metric === 'stress') return 'down'
  return 'up'
}

function improved(delta: number | null, good: DirectionGood): boolean | null {
  if (delta == null || !Number.isFinite(delta)) return null
  return good === 'down' ? delta < 0 : delta > 0
}

function confidenceLabel(score: number) {
  if (score >= 0.75) return 'high'
  if (score >= 0.55) return 'medium'
  return 'low'
}

function pillTone(alignment: ReviewAlignment) {
  if (alignment === 'aligned') return 'good'
  if (alignment === 'mismatch') return 'bad'
  return 'neutral'
}

// Metric labels/units (keep UI stable)
const METRIC_META: Record<string, { label: string; unit?: string }> = {
  stress: { label: 'Stress' },
  mood: { label: 'Mood' },
  energy: { label: 'Energy' },
  sleep_hours: { label: 'Sleep', unit: 'h' },
  steps: { label: 'Steps' },
  water_liters: { label: 'Water', unit: 'L' },
  outdoor_minutes: { label: 'Outdoor', unit: 'min' }
}

function labelForMetric(key: string) {
  return METRIC_META[key]?.label ?? key
}
function unitForMetric(key: string) {
  return METRIC_META[key]?.unit
}

// Lever labels (fallback to ref)
const LEVER_LABELS: Record<string, string> = {
  cold_shower: 'Cold shower',
  evening_walk: 'Evening walk',
  morning_walk: 'Morning walk',
  no_caffeine_after_2pm: 'No caffeine after 2pm',
  screens_off_1h: 'Screens off 1h before bed',
  meditation_10m: 'Meditation (10 min)'
}
function labelForLever(ref: string) {
  return LEVER_LABELS[ref] ?? ref
}

export default defineEventHandler(async (event): Promise<ExperimentReviewDTO> => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const id = String(event.context.params?.id || '')
  if (!isUUID(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid experiment id' })

  const supabase = await serverSupabaseClient(event)

  // 1) Load experiment row (narration/meta still lives here)
  const { data: exp, error: expErr } = await supabase
    .from('experiments')
    .select(
      'id,user_id,status,start_date,end_date,title,lever_ref,target_metric,baseline_days,recommended_days,outcome,what_worked,try_next'
    )
    .eq('id', id)
    .eq('user_id', uid)
    .maybeSingle()

  if (expErr) throw createError({ statusCode: 500, statusMessage: expErr.message })
  if (!exp) throw createError({ statusCode: 404, statusMessage: 'Experiment not found' })

  const status = String(exp.status || '') as ExperimentStatus
  const start = String(exp.start_date || '')
  const end = exp.end_date ? String(exp.end_date) : null

  const leverRef = String(exp.lever_ref || '')
  const targetMetric = String(exp.target_metric || 'stress')

  // 2) Load deterministic effects (truth layer)
  const { data: effects, error: effErr } = await supabase
    .from('experiment_effects')
    .select(
      'metric_key,baseline_avg,experiment_avg,delta,baseline_rows,experiment_rows,baseline_start,baseline_end,experiment_start,experiment_end,method_version'
    )
    .eq('experiment_id', id)
    .eq('method_version', 1)

  if (effErr) throw createError({ statusCode: 500, statusMessage: effErr.message })

  // Use first row for windows if present (same across metrics)
  const win = (effects && effects.length ? effects[0] : null) as any

  // 3) Outcome (alignment/confidence/conclusion) still comes from experiments.outcome
  const outcome = (exp.outcome || {}) as any
  const alignment = (outcome.alignment || 'unclear') as ReviewAlignment
  const confScoreRaw = Number(outcome.confidence_score ?? 0.5)
  const confScore = Number.isFinite(confScoreRaw) ? Math.max(0, Math.min(1, confScoreRaw)) : 0.5
  const confLabel = confidenceLabel(confScore)

  const conclusion = outcome?.conclusion ?? null

  // 4) Build metricsObj from effects (same shape your toMetricDTO expects)
  const metricsObj: Record<
    string,
    {
      baseline?: number | null
      experiment?: number | null
      delta?: number | null
      direction_good?: DirectionGood
      n_baseline?: number
      n_experiment?: number
    }
  > = {}

  for (const row of effects || []) {
    const key = String((row as any).metric_key)
    const b = row.baseline_avg != null ? Number(row.baseline_avg) : null
    const e = row.experiment_avg != null ? Number(row.experiment_avg) : null
    const d = row.delta != null ? Number(row.delta) : null

    metricsObj[key] = {
      baseline: b == null ? null : round1(b),
      experiment: e == null ? null : round1(e),
      delta: d == null ? null : round1(d),
      direction_good: directionGoodFor(key),
      n_baseline: Number(row.baseline_rows ?? 0),
      n_experiment: Number(row.experiment_rows ?? 0)
    }
  }

  // Signal gating (keep same rules)
  const MIN_SIGNAL = 0.2
  const MIN_POINTS = 4

  function toMetricDTO(key: string): ReviewMetricDTO {
    const m = metricsObj[key] || {}
    const base = m.baseline ?? null
    const ex = m.experiment ?? null
    const d = m.delta ?? null
    const good = (m.direction_good as DirectionGood) || directionGoodFor(key)

    const nBase = Number(m.n_baseline ?? 0)
    const nExp = Number(m.n_experiment ?? 0)

    const hasSignal =
      typeof d === 'number' &&
      Number.isFinite(d) &&
      Math.abs(d) >= MIN_SIGNAL &&
      nBase >= MIN_POINTS &&
      nExp >= MIN_POINTS

    return {
      key,
      label: labelForMetric(key),
      unit: unitForMetric(key),
      directionGood: good,
      baselineAvg: typeof base === 'number' && Number.isFinite(base) ? base : null,
      experimentAvg: typeof ex === 'number' && Number.isFinite(ex) ? ex : null,
      delta: typeof d === 'number' && Number.isFinite(d) ? d : null,
      deltaText: formatDelta(typeof d === 'number' && Number.isFinite(d) ? d : null, unitForMetric(key)),
      isSignal: hasSignal,
      isImprovement: hasSignal ? improved(d, good) : null
    }
  }

  // Target + others ordering
  const targetDTO = toMetricDTO(targetMetric)

  const defaultOthers = ['sleep_hours', 'mood', 'energy', 'stress'].filter((k) => k !== targetMetric)
  const keysInEffects = Object.keys(metricsObj || {}).filter((k) => k !== targetMetric)
  const othersKeys = Array.from(new Set([...defaultOthers, ...keysInEffects]))
  const others = othersKeys.map(toMetricDTO)

  // Notes: use table columns (per your schema)
  const whatWorked: string[] = Array.isArray((exp as any).what_worked) ? (exp as any).what_worked : []
  const tryNext: string[] = Array.isArray((exp as any).try_next) ? (exp as any).try_next : []

  // Windows: prefer deterministic window dates if present; else fallback
  const baselineDays = Number(exp.baseline_days ?? outcome.baseline_days ?? 7)
  const experimentDays = Number(exp.recommended_days ?? outcome.experiment_days ?? 7)

  const baselineStart = win?.baseline_start ? String(win.baseline_start) : String(outcome?.windows?.baseline?.start || '')
  const baselineEnd = win?.baseline_end ? String(win.baseline_end) : String(outcome?.windows?.baseline?.end || '')

  const experimentStart = win?.experiment_start
    ? String(win.experiment_start)
    : String(outcome?.windows?.experiment?.start || start || '')

  // Keep end nullable in DTO (your UI uses this)
  const experimentEndFromEffects = win?.experiment_end ? String(win.experiment_end) : null
  const experimentEnd = end ?? experimentEndFromEffects ?? String(outcome?.windows?.experiment?.end || '')

  const pillText = `${alignment.charAt(0).toUpperCase() + alignment.slice(1)} • ${confLabel} confidence`

  return {
    id: String(exp.id),
    title: exp.title ?? null,
    leverRef,
    leverLabel: labelForLever(leverRef),
    targetMetric,
    targetLabel: labelForMetric(targetMetric),

    status,
    dateRange: { start, end },

    windows: {
      baseline: {
        start: baselineStart,
        end: baselineEnd,
        days: Number.isFinite(baselineDays) ? baselineDays : 7
      },
      experiment: {
        start: experimentStart,
        end: end, // keep truly nullable end
        days: Number.isFinite(experimentDays) ? experimentDays : 7
      }
    },

    outcome: {
      alignment,
      confidenceScore: confScore,
      confidenceLabel: confLabel,
      summaryPill: { tone: pillTone(alignment), text: pillText }
    },

    conclusion,

    metrics: {
      target: targetDTO,
      others
    },

    notes: {
      whatWorked,
      tryNext
    }
  }
})