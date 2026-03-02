import { defineEventHandler, createError } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

function isUUID(v: string) {
  return /^[0-9a-fA-F-]{36}$/.test(v)
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const id = String(event.context.params?.id || '')
  if (!isUUID(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid experiment id' })

  const supabase = await serverSupabaseClient(event)

  // Ensure experiment exists and belongs to user (no leaking)
  const { data: exp, error: expErr } = await supabase
    .from('experiments')
    .select('id,user_id')
    .eq('id', id)
    .eq('user_id', uid)
    .maybeSingle()

  if (expErr) throw createError({ statusCode: 500, statusMessage: expErr.message })
  if (!exp) throw createError({ statusCode: 404, statusMessage: 'Experiment not found' })

  // Recompute (method_version=1)
  const { error: rpcErr } = await supabase.rpc('upsert_experiment_effects_v1', {
    p_experiment_id: id,
    p_method_version: 1
  })

  if (rpcErr) throw createError({ statusCode: 500, statusMessage: rpcErr.message })

  return { ok: true }
})