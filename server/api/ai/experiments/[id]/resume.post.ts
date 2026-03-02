// server/api/ai/experiments/[id]/resume.post.ts
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

  const { data: exp, error: expErr } = await supabase
    .from('experiments')
    .select('id,user_id,status,start_date,end_date')
    .eq('id', id)
    .eq('user_id', uid)
    .maybeSingle()

  if (expErr) throw createError({ statusCode: 500, statusMessage: expErr.message })
  if (!exp) throw createError({ statusCode: 404, statusMessage: 'Experiment not found' })

  // Cannot resume these
  if (exp.status === 'completed') throw createError({ statusCode: 409, statusMessage: 'Experiment is completed' })
  if (exp.status === 'abandoned') throw createError({ statusCode: 409, statusMessage: 'Experiment is abandoned' })

  // Resume is only for experiments that were ended for review
  if (exp.status !== 'ended_pending_review') {
    throw createError({ statusCode: 409, statusMessage: `Experiment is not resumable (status=${exp.status})` })
  }
  if (!exp.end_date) {
    throw createError({ statusCode: 409, statusMessage: 'Experiment has no end_date to resume from' })
  }

  const { data: updated, error: updErr } = await supabase
    .from('experiments')
    .update({
      end_date: null,
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', uid)
    .select('*')
    .single()

  if (updErr) throw createError({ statusCode: 500, statusMessage: updErr.message })

  // Optional: log event (best-effort)
  await supabase.from('experiment_events').insert({
    user_id: uid,
    experiment_id: id,
    type: 'resumed',
    payload: {}
  })

  return { success: true, experiment: updated }
})
