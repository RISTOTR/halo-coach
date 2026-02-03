// server/api/ai/experiments/[id]/end.post.ts
import { defineEventHandler, createError, readBody } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const bodySchema = z.object({
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const id = String(event.context.params?.id || '')
  const supabase = await serverSupabaseClient(event)

  const { endDate } = bodySchema.parse(await readBody(event).catch(() => ({})))
  const end_date = endDate ?? new Date().toISOString().slice(0, 10)

  const { data: exp, error: expErr } = await supabase
    .from('experiments')
    .select('id,user_id,status,start_date,end_date,title,target_metric')
    .eq('id', id)
    .eq('user_id', uid)
    .maybeSingle()

  if (expErr) throw createError({ statusCode: 500, statusMessage: expErr.message })
  if (!exp) throw createError({ statusCode: 404, statusMessage: 'Experiment not found' })

  // Idempotent
  if (exp.end_date) {
    return { success: true, alreadyEnded: true, experiment: exp }
  }

  if (exp.status !== 'active') {
    throw createError({ statusCode: 409, statusMessage: `Cannot end experiment in status=${exp.status}` })
  }

  const { data: updated, error: updErr } = await supabase
    .from('experiments')
    .update({
      end_date,
      status: 'ended_pending_review',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', uid)
    .select('*')
    .single()

  if (updErr) throw createError({ statusCode: 500, statusMessage: updErr.message })

  return { success: true, alreadyEnded: false, experiment: updated }
})
