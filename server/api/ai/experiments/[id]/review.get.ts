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

// You can replace these with your preset catalog later.
// For now: keep frontend clean by always sending labels.
const METRIC_META: Record<string, { label: string; unit?: string }> = {
  stress: { label: 'Stress' },
  mood: { label: 'Mood' },
  energy: { label: 'Energy' },
  sleep_hours: { label: 'Sleep', unit: 'h' }
}

function labelForMetric(key: string) {
  return METRIC_META[key]?.label ?? key
}
function unitForMetric(key: string) {
  return METRIC_META[key]?.unit
}

// Minimal lever label mapping (safe fallback to leverRef)
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

  const { data: exp, error: expErr } = await supabase
    .from('experiments')
    .select('id,user_id,status,start_date,end_date,title,lever_ref,target_metric,baseline_days,recommended_days,outcome')
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

  const outcome = (exp.outcome || {}) as any
  const alignment = (outcome.alignment || 'unclear') as ReviewAlignment
  const confScoreRaw = Number(outcome.confidence_score ?? 0.5)
  const confScore = Number.isFinite(confScoreRaw) ? Math.max(0, Math.min(1, confScoreRaw)) : 0.5

  const windows = outcome.windows || {}
  const baselineWin = windows.baseline || {}
  const experimentWin = windows.experiment || {}

  const baselineDays = Number(outcome.baseline_days ?? exp.baseline_days ?? 7)
  const experimentDays = Number(outcome.experiment_days ?? (start && end ? undefined : exp.recommended_days ?? 7)) // fallback

  // metrics snapshot from outcome (preferred)
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
  > = outcome.metrics || {}

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

  // Pick target + “others” in a consistent order
  const targetDTO = toMetricDTO(targetMetric)

  const defaultOthers = ['sleep_hours', 'mood', 'energy', 'stress'].filter((k) => k !== targetMetric)
  const keysInOutcome = Object.keys(metricsObj || {}).filter((k) => k !== targetMetric)

  // Prefer your core list order, then any extra keys from outcome
  const othersKeys = Array.from(new Set([...defaultOthers, ...keysInOutcome]))
  const others = othersKeys.map(toMetricDTO)

  const whatWorked: string[] = Array.isArray(outcome.what_worked) ? outcome.what_worked : []
  const tryNext: string[] = Array.isArray(outcome.try_next) ? outcome.try_next : []

  const confLabel = confidenceLabel(confScore)
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
        start: String(baselineWin.start || ''),
        end: String(baselineWin.end || ''),
        days: Number.isFinite(baselineDays) ? baselineDays : 7
      },
      experiment: {
        start: String(experimentWin.start || start || ''),
        end: String(experimentWin.end || end || ''),
        days: Number.isFinite(experimentDays) ? experimentDays : 7
      }
    },

    outcome: {
      alignment,
      confidenceScore: confScore,
      confidenceLabel: confLabel,
      summaryPill: { tone: pillTone(alignment), text: pillText }
    },

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
