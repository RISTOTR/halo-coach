import { defineEventHandler, createError } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = await serverSupabaseClient(event)

const { data, error } = await supabase
  .from('experiments')
  .select('*')
  .eq('user_id', uid)
  .eq('status', 'active')
  .is('end_date', null)          // <<< IMPORTANT
  .order('start_date', { ascending: false })
  .limit(1)
  .maybeSingle()


  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, experiment: data || null }
})
