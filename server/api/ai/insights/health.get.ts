import { defineEventHandler, createError } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = await serverSupabaseClient(event)

  const [{ count: metricsCount }, { count: experimentsCount }, { count: effectsCount }, { count: insightsCount }] =
    await Promise.all([
      supabase.from('daily_metrics').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('experiments').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('experiment_effects').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('ai_weekly_insights').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    ])

  const { data: lastInsight } = await supabase
    .from('ai_weekly_insights')
    .select('computed_at')
    .eq('user_id', user.id)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: lastEvent } = await supabase
    .from('insight_events')
    .select('created_at,kind')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    coverage: {
      daily_metrics: metricsCount ?? 0,
      experiments: experimentsCount ?? 0,
      experiment_effects: effectsCount ?? 0,
      ai_weekly_insights: insightsCount ?? 0
    },
    last: {
      computed_at: lastInsight?.computed_at ?? null,
      event: lastEvent ?? null
    }
  }
})