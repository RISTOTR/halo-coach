import { defineEventHandler, getQuery, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { toWeekKey } from '~/server/lib/time/weekKey'

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { date } = querySchema.parse(getQuery(event))
  const weekKey = toWeekKey(date)

  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase
    .from('ai_weekly_insights')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_key', weekKey)
    .single()

  if (error) {
    // If you prefer auto-compute, we can call internal compute logic instead.
    throw createError({ statusCode: 404, statusMessage: 'Weekly insight not found. Compute first.' })
  }

  return {
    weekKey: data.week_key,
    windowStart: data.window_start,
    windowEnd: data.window_end,
    drift: data.drift,
    gate: data.gate,
    nextFocusOptions: data.next_focus_options,
    computedAt: data.computed_at
  }
})