import { defineEventHandler, getQuery, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional()
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = await serverSupabaseClient(event)
  const { limit } = querySchema.parse(getQuery(event))

  const { data, error } = await supabase
    .from('experiment_reviews')
    .select('id,created_at,experiment_id,confidence,alignment,subjective_rating,baseline_from,baseline_to,experiment_from,experiment_to,metrics')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(limit ?? 50)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, items: data || [] }
})
