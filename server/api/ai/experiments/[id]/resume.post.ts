// server/api/ai/experiments/[id]/resume.post.ts
import { defineEventHandler, createError } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const id = (event.context.params?.id || '').toString()
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid experiment id' })
  }

  const supabase = await serverSupabaseClient(event)

  const { data: exp, error: expErr } = await supabase
    .from('experiments')
    .select('id,user_id,status,start_date,end_date')
    .eq('id', id)
    .eq('user_id', uid)
    .maybeSingle()

  if (expErr) throw createError({ statusCode: 500, statusMessage: expErr.message })
  if (!exp) throw createError({ statusCode: 404, statusMessage: 'Experiment not found' })
  if (exp.status !== 'active') throw createError({ statusCode: 409, statusMessage: 'Experiment is not active' })
  if (!exp.end_date) throw createError({ statusCode: 409, statusMessage: 'Experiment is not ended' })

  const { data: updated, error: updErr } = await supabase
    .from('experiments')
    .update({
      end_date: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', uid)
    .select('*')
    .single()

  if (updErr) throw createError({ statusCode: 500, statusMessage: updErr.message })

  return { success: true, experiment: updated }
})
