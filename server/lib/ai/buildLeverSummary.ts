import { createError } from 'h3'
import type { LeverPattern } from '~/server/lib/ai/types'

function confidenceLabel(n: number) {
  if (n >= 6) return 'high'
  if (n >= 3) return 'medium'
  return 'low'
}

function isGood(metric: string, delta: number) {
  if (metric === 'stress') return delta < 0
  return delta > 0
}

export async function buildLeverSummary(params: {
  supabase: any
  uid: string
  windowDays: number
  metricKey?: string
  groupBy: 'lever_type' | 'lever_ref'
}) {
  const { supabase, uid, windowDays, metricKey, groupBy } = params

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  let fxQuery = supabase
    .from('experiment_effects')
    .select(
      `
      experiment_id,
      metric_key,
      delta,
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
    .in('experiments.status', ['completed', 'ended_pending_review', 'abandoned'])

  if (metricKey) fxQuery = fxQuery.eq('metric_key', metricKey)

  const { data, error } = await fxQuery
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = (data ?? []).filter((r: any) => typeof r?.delta === 'number' && Number.isFinite(r.delta))

  type Agg = {
    group: string
    groupBy: 'lever_type' | 'lever_ref'
    targetMetric: string
    metricKey: string
    n: number
    sum: number
    improvedCount: number
  }

  const map = new Map<string, Agg>()

  for (const r of rows as any[]) {
    const exp = r.experiments
    const bucket = String(groupBy === 'lever_ref' ? exp?.lever_ref : exp?.lever_type)
    if (!bucket) continue

    const t = String(exp?.target_metric ?? '')
    if (!t) continue

    const mKey = String(r.metric_key)
    const k = `${bucket}__${t}__${mKey}`

    const delta = Number(r.delta)
    const prev = map.get(k)

    if (!prev) {
      map.set(k, {
        group: bucket,
        groupBy,
        targetMetric: t,
        metricKey: mKey,
        n: 1,
        sum: delta,
        improvedCount: isGood(mKey, delta) ? 1 : 0
      })
    } else {
      prev.n += 1
      prev.sum += delta
      if (isGood(mKey, delta)) prev.improvedCount += 1
    }
  }

  const items: LeverPattern[] = Array.from(map.values())
    .map(a => {
      const avgDelta = a.sum / a.n
      return {
        groupBy: a.groupBy,
        group: a.group,
        targetMetric: a.targetMetric,
        metricKey: a.metricKey,
        n: a.n,
        avgDelta: Math.round(avgDelta * 100) / 100,
        improvedRate: Math.round((a.improvedCount / a.n) * 100),
        confidence: confidenceLabel(a.n)
      }
    })

  return { since, windowDays, groupBy, metricKey: metricKey ?? null, items }
}