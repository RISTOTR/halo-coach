import { defineEventHandler, getQuery, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const querySchema = z.object({
  windowDays: z.coerce.number().int().min(7).max(3650).optional(),
  metricKey: z
    .enum(['sleep_hours', 'mood', 'energy', 'stress', 'steps', 'water_liters', 'outdoor_minutes'])
    .optional(),
  groupBy: z.enum(['lever_type', 'lever_ref']).optional()
})

function confidenceLabel(n: number) {
  if (n >= 6) return 'high'
  if (n >= 3) return 'medium'
  return 'low'
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const q = querySchema.parse(getQuery(event))
  const windowDays = q.windowDays ?? 180
  const metricKey = q.metricKey // optional filter
  const groupBy = q.groupBy ?? 'lever_type'

  const supabase = await serverSupabaseClient(event)
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Pull effects + join experiments (client-side group; easy + safe)
  let fxQuery = supabase
    .from('experiment_effects')
    .select(
      `
      experiment_id,
      metric_key,
      delta,
      baseline_rows,
      experiment_rows,
      experiments!inner (
        user_id,
        status,
        start_date,
        end_date,
        lever_type,
        lever_ref,
        target_metric
      )
    `
    )
    .eq('experiments.user_id', uid)
    .gte('experiments.start_date', since)
    .eq('method_version', 1)

  if (metricKey) fxQuery = fxQuery.eq('metric_key', metricKey)

  // Only include experiments that are not active (optional, but recommended)
  fxQuery = fxQuery.in('experiments.status', ['completed', 'ended_pending_review', 'abandoned'])

  const { data, error } = await fxQuery
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = (data ?? []).filter((r: any) => typeof r?.delta === 'number' && Number.isFinite(r.delta))

  // Aggregate
  type Agg = {
    key: string
    n: number
    avgDelta: number
    sum: number
    // optional: count how often delta is "good" for the metric
    improvedCount: number
    targetMetric: string
    metricKey: string
  }

  function isGood(metric: string, delta: number) {
    if (metric === 'stress') return delta < 0
    return delta > 0
  }

  const map = new Map<string, Agg>()

  for (const r of rows as any[]) {
    const exp = r.experiments
    const bucket = String(groupBy === 'lever_ref' ? exp?.lever_ref : exp?.lever_type)
    if (!bucket) continue

    const mKey = String(r.metric_key)
    const t = String(exp?.target_metric ?? '')
    if (!t) continue
    const k = `${bucket}__${t}__${mKey}`

    const delta = Number(r.delta)
    const prev = map.get(k)

    if (!prev) {
      map.set(k, {
        key: bucket,
        metricKey: mKey,
        n: 1,
        sum: delta,
        avgDelta: delta,
        improvedCount: isGood(mKey, delta) ? 1 : 0
      })
    } else {
      prev.n += 1
      prev.sum += delta
      prev.avgDelta = prev.sum / prev.n
      if (isGood(mKey, delta)) prev.improvedCount += 1
    }
  }

  const items = Array.from(map.values())
    .map((a) => ({
      group: a.key,
      targetMetric: a.targetMetric,
      metricKey: a.metricKey,
      n: a.n,
      avgDelta: Math.round(a.avgDelta * 100) / 100,
      improvedRate: Math.round((a.improvedCount / a.n) * 100),
      confidence: confidenceLabel(a.n)
    }))
    // sort: strongest signal first (for stress, more negative is better; but we sort by absolute)
    .sort((a, b) =>
  (b.improvedRate - a.improvedRate) ||
  (b.n - a.n) ||
  (Math.abs(b.avgDelta) - Math.abs(a.avgDelta))
)

  
  return {
    windowDays,
    since,
    groupBy,
    metricKey: metricKey ?? null,
    items
  }
})