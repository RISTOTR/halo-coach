// server/api/ai/experiments/[id]/end.post.ts
import { defineEventHandler, createError } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const id = String(event.context.params?.id || '')
  const supabase = await serverSupabaseClient(event)

  const { data: exp, error: expErr } = await supabase
    .from('experiments')
    .select('id,user_id,status,start_date,end_date,title,target_metric')
    .eq('id', id)
    .eq('user_id', uid)
    .maybeSingle()

  if (expErr) throw createError({ statusCode: 500, statusMessage: expErr.message })
  if (!exp) throw createError({ statusCode: 404, statusMessage: 'Experiment not found' })

  // If already ended, be idempotent
  if (exp.end_date) {
    return { success: true, alreadyEnded: true, experiment: exp }
  }

  if (exp.status !== 'active') {
    throw createError({ statusCode: 409, statusMessage: `Cannot end experiment in status=${exp.status}` })
  }

  const today = new Date().toISOString().slice(0, 10)

  const { data: updated, error: updErr } = await supabase
    .from('experiments')
    .update({
      end_date: today,
      status: 'ended', // or 'ended_pending_review'
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', uid)
    .select('*')
    .single()

  if (updErr) throw createError({ statusCode: 500, statusMessage: updErr.message })

  return { success: true, alreadyEnded: false, experiment: updated }
})
