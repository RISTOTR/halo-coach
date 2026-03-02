import { defineEventHandler, getQuery, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { requireUid } from '~/server/lib/auth/uid'

const querySchema = z.object({
  windowDays: z.coerce.number().int().min(7).max(3650).default(60),
  minN: z.coerce.number().int().min(3).max(3650).default(14)
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401 })

  const uid = requireUid(user) // ✅

  const { windowDays, minN } = querySchema.parse(getQuery(event))
  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase.rpc('get_metric_correlations', {
    p_user_id: uid,           // ✅ must be real uuid
    p_window_days: windowDays,
    p_min_n: minN
  })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return {
    items: (data ?? []).map((r: any) => ({
      x: r.metric_x,
      y: r.metric_y,
      n: r.n,
      corr: r.corr_value
    }))
  }
})