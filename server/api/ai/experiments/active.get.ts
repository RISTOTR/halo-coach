import { defineEventHandler, createError } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

type ActiveExperimentDTO = {
  hasActive: boolean
  experiment: null | {
    id: string
    title: string | null
    leverRef: string
    leverLabel: string
    targetMetric: string
    targetLabel: string
    startDate: string
    recommendedDays: number
    day: number
    status: 'active'
  }
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function diffDaysInclusive(start: string, end: string) {
  const a = new Date(`${start}T00:00:00.000Z`).getTime()
  const b = new Date(`${end}T00:00:00.000Z`).getTime()
  const diff = Math.floor((b - a) / (1000 * 60 * 60 * 24))
  return Math.max(1, diff + 1)
}

// Same placeholders you used in review.get.ts (swap later for preset catalog)
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
  sleep_hours: 'Sleep consistency',
  mood: 'Mood practice',
  stress: 'Stress reduction',
  energy: 'Energy boost',
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

export default defineEventHandler(async (event): Promise<ActiveExperimentDTO> => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase
    .from('experiments')
    .select('id,title,status,start_date,lever_ref,target_metric,recommended_days')
    .eq('user_id', uid)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const exp = data?.[0]
  if (!exp) return { hasActive: false, experiment: null }

  const startDate = String(exp.start_date || '')
  const today = isoDate(new Date())
  const day = startDate ? diffDaysInclusive(startDate, today) : 1

  const leverRef = String(exp.lever_ref || '')
  const targetMetric = String(exp.target_metric || 'stress')

  return {
    hasActive: true,
    experiment: {
      id: String(exp.id),
      title: exp.title ?? null,
      leverRef,
      leverLabel: labelForLever(leverRef),
      targetMetric,
      targetLabel: labelForMetric(targetMetric),
      startDate,
      recommendedDays: Number(exp.recommended_days ?? 7) || 7,
      day,
      status: 'active'
    }
  }
})
