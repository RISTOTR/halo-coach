import { defineEventHandler, getQuery, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const querySchema = z.object({
  windowDays: z.coerce.number().int().min(7).max(3650).default(60),
  minN: z.coerce.number().int().min(3).max(3650).default(14)
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  // IMPORTANT: your app sometimes uses sub instead of id
  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized (no uid)' })

  const { windowDays, minN } = querySchema.parse(getQuery(event))
  const supabase = await serverSupabaseClient(event)

  const args = {
    p_user_id: uid,
    p_window_days: windowDays,
    p_min_n: minN
  }

  // Hard guard: if uid is undefined you'll get the exact schema-cache error you see
  if (!args.p_user_id) {
    throw createError({ statusCode: 500, statusMessage: 'p_user_id missing at runtime' })
  }

  const { data, error } = await supabase.rpc('get_metric_correlations', args)

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