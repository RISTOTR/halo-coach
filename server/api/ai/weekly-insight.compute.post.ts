import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

import type { NextFocusOption, WeeklyInsight } from '~/server/lib/ai/types'
import { gate } from '~/server/lib/ai/gate'
import { computeDeltas, makeDriftSummary } from '~/server/lib/ai/drift'
import { noveltyPenalty } from '~/server/lib/ai/novelty'
import { scoreAndSort } from '~/server/lib/ai/rank'
import { toWeekKey, weekWindowEnd } from '~/server/lib/time/weekkey'

import { buildCandidates } from '~/server/lib/ai/buildCandidates'
import { PRESETS } from '~/server/lib/ai/presets' // you create this list

const presets = PRESETS // array of Preset objects

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { date } = bodySchema.parse(await readBody(event))
  const supabase = await serverSupabaseClient(event)

  const weekKey = toWeekKey(date)
  const { windowStart, windowEnd } = weekWindowEnd(date)

  // --- Drift windows: prev7 and last7 inside the 14-day window [end-13, end]
  const last7Start = new Date(`${date}T00:00:00Z`); last7Start.setUTCDate(last7Start.getUTCDate() - 6)
  const prev7Start = new Date(`${date}T00:00:00Z`); prev7Start.setUTCDate(prev7Start.getUTCDate() - 13)
  const prev7End = new Date(`${date}T00:00:00Z`); prev7End.setUTCDate(prev7End.getUTCDate() - 7)

  const last7StartStr = last7Start.toISOString().slice(0, 10)
  const prev7StartStr = prev7Start.toISOString().slice(0, 10)
  const prev7EndStr = prev7End.toISOString().slice(0, 10)

  const { data: rowsLast7, error: e1 } = await supabase
    .from('daily_metrics')
    .select('date,sleep_hours,mood,energy,stress')
    .eq('user_id', user.id)
    .gte('date', last7StartStr)
    .lte('date', date)
    .order('date', { ascending: true })

  if (e1) throw createError({ statusCode: 500, statusMessage: e1.message })

  const { data: rowsPrev7, error: e2 } = await supabase
    .from('daily_metrics')
    .select('date,sleep_hours,mood,energy,stress')
    .eq('user_id', user.id)
    .gte('date', prev7StartStr)
    .lte('date', prev7EndStr)
    .order('date', { ascending: true })

  if (e2) throw createError({ statusCode: 500, statusMessage: e2.message })

  const deltas = computeDeltas(rowsLast7 ?? [], rowsPrev7 ?? [])
  const drift = makeDriftSummary({ deltas, windowStart, windowEnd })

  // --- Gating inputs
  const { data: effectsAgg, error: e3 } = await supabase
    .from('experiment_effects')
    .select('experiment_rows')
    .eq('user_id', user.id)

  if (e3) throw createError({ statusCode: 500, statusMessage: e3.message })

  const experimentRowsMax = Math.max(0, ...(effectsAgg ?? []).map(r => r.experiment_rows ?? 0))

  const { data: corrs, error: e4 } = await supabase.rpc('get_metric_correlations', {
    p_user_id: user.id,
    p_window_days: 30,
    p_min_n: 14
  })

  if (e4) throw createError({ statusCode: 500, statusMessage: e4.message })

  const corrNMax = Math.max(0, ...(corrs ?? []).map((r: any) => r.n ?? 0))
  const gateResult = gate({ experimentRows: experimentRowsMax, corrN: corrNMax })

  // --- Novelty: last use of leverRef (days since last use)
  // We'll fetch the most recent start_date per lever_ref (non-null), last 60 days.
  const since60 = new Date(`${date}T00:00:00Z`); since60.setUTCDate(since60.getUTCDate() - 60)
  const since60Str = since60.toISOString().slice(0, 10)

  const { data: recentExps, error: e5 } = await supabase
    .from('experiments')
    .select('lever_ref,start_date')
    .eq('user_id', user.id)
    .not('lever_ref', 'is', null)
    .gte('start_date', since60Str)
    .order('start_date', { ascending: false })

  if (e5) throw createError({ statusCode: 500, statusMessage: e5.message })

  const lastUseByLever = new Map<string, string>() // lever_ref -> start_date (most recent)
  for (const r of recentExps ?? []) {
    if (!r.lever_ref || lastUseByLever.has(r.lever_ref)) continue
    lastUseByLever.set(r.lever_ref, r.start_date)
  }

  function daysSince(leverRef?: string) {
    if (!leverRef) return null
    const last = lastUseByLever.get(leverRef)
    if (!last) return null
    const a = new Date(`${date}T00:00:00Z`).getTime()
    const b = new Date(`${last}T00:00:00Z`).getTime()
    return Math.floor((a - b) / 86400000)
  }


  const primary = drift.primaryMetric

const candidates = buildCandidates({
  weekKey,
  presets,
  gate: gateResult,
  deltas,
  primaryDrift: drift.primaryMetric,
  daysSinceLeverRef: daysSince,
  corrNMax,
  experimentRowsMax
})

const ranked = scoreAndSort({ options: candidates, primaryDriftMetric: drift.primaryMetric }).slice(0, 5)


  // --- Persist
  const { data: upserted, error: e6 } = await supabase
    .from('ai_weekly_insights')
    .upsert({
      user_id: user.id,
      week_key: weekKey,
      window_start: windowStart,
      window_end: windowEnd,
      drift,
      gate: gateResult,
      next_focus_options: ranked,
      computed_at: new Date().toISOString()
    })
    .select('computed_at')
    .single()

  if (e6) throw createError({ statusCode: 500, statusMessage: e6.message })

  // --- Log
  await supabase.from('insight_events').insert({
    user_id: user.id,
    kind: 'weekly_insight_computed',
    payload: {
      weekKey,
      gate: gateResult,
      driftPrimary: primary,
      corrNMax,
      experimentRowsMax,
      topOptionId: ranked[0]?.id
    }
  })

  const res: WeeklyInsight = {
    weekKey,
    windowStart,
    windowEnd,
    drift,
    gate: gateResult,
    nextFocusOptions: ranked,
    computedAt: upserted?.computed_at ?? new Date().toISOString()
  }

  return res
})