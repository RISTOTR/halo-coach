import { defineEventHandler, createError, getQuery } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

type ReviewAlignment = 'aligned' | 'mismatch' | 'unclear'
type HistoryStatus = 'completed' | 'abandoned' | 'ended_pending_review'

type ExperimentHistoryItemDTO = {
  id: string
  title: string | null
  status: HistoryStatus
  startDate: string
  endDate: string | null
  leverRef: string
  leverLabel: string
  targetMetric: string
  targetLabel: string
  pill: { tone: 'good' | 'bad' | 'neutral'; text: string }
}

function clampInt(v: any, def: number, min: number, max: number) {
  const n = Number(v)
  if (!Number.isFinite(n)) return def
  return Math.max(min, Math.min(max, Math.floor(n)))
}

function confidenceLabel(score: number) {
  if (score >= 0.75) return 'High'
  if (score >= 0.55) return 'Medium'
  return 'Low'
}

function pillTone(alignment: ReviewAlignment) {
  if (alignment === 'aligned') return 'good'
  if (alignment === 'mismatch') return 'bad'
  return 'neutral'
}

const METRIC_META: Record<string, { label: string }> = {
  stress: { label: 'Stress' },
  mood: { label: 'Mood' },
  energy: { label: 'Energy' },
  sleep_hours: { label: 'Sleep' }
}
function labelForMetric(key: string) {
  return METRIC_META[key]?.label ?? key
}

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

export default defineEventHandler(async (event): Promise<{ items: ExperimentHistoryItemDTO[] }> => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const q = getQuery(event)
  const limit = clampInt(q.limit, 20, 1, 50)
  const includePending = String(q.includePending ?? 'true') !== 'false'

  const statuses: HistoryStatus[] = includePending
    ? ['completed', 'abandoned', 'ended_pending_review']
    : ['completed', 'abandoned']

  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase
    .from('experiments')
    .select('id,title,status,start_date,end_date,lever_ref,target_metric,outcome')
    .eq('user_id', uid)
    .in('status', statuses)
    .order('start_date', { ascending: false })
    .limit(limit)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const items: ExperimentHistoryItemDTO[] = (data || []).map((row: any) => {
    const outcome = (row.outcome || {}) as any
    const alignment = (outcome.alignment || 'unclear') as ReviewAlignment

    const scoreRaw = Number(outcome.confidence_score ?? 0.5)
    const score = Number.isFinite(scoreRaw) ? Math.max(0, Math.min(1, scoreRaw)) : 0.5

    const conf = confidenceLabel(score)
    const pillText = `${alignment.charAt(0).toUpperCase() + alignment.slice(1)} • ${conf}`

    const leverRef = String(row.lever_ref || '')
    const targetMetric = String(row.target_metric || 'stress')

    return {
      id: String(row.id),
      title: row.title ?? null,
      status: row.status as HistoryStatus,
      startDate: String(row.start_date || ''),
      endDate: row.end_date ? String(row.end_date) : null,
      leverRef,
      leverLabel: labelForLever(leverRef),
      targetMetric,
      targetLabel: labelForMetric(targetMetric),
      pill: { tone: pillTone(alignment), text: pillText }
    }
  })

  return { items }
})
