import { defineEventHandler, getQuery, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const querySchema = z.object({
  days: z.coerce.number().int().min(7).max(180).default(60)
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401 })

  const { days } = querySchema.parse(getQuery(event))
  const supabase = await serverSupabaseClient(event)

  const since = new Date()
  since.setUTCDate(since.getUTCDate() - days)
  const sinceStr = since.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('experiments')
    .select('lever_ref,start_date')
    .eq('user_id', user.id)
    .not('lever_ref', 'is', null)
    .gte('start_date', sinceStr)
    .order('start_date', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // return most recent date per lever_ref
  const map: Record<string, string> = {}
  for (const r of data ?? []) {
    if (!r.lever_ref) continue
    if (!map[r.lever_ref]) map[r.lever_ref] = r.start_date
  }

  return { lastUseByLeverRef: map }
})