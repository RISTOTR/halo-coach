import { defineEventHandler, createError, readBody } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

function isUUID(v: string) {
  return /^[0-9a-fA-F-]{36}$/.test(v)
}

const bodySchema = z.object({
  whatWorked: z.array(z.string()).optional(),
  tryNext: z.array(z.string()).optional(),
  finalize: z.boolean().optional()
})

function cleanBullets(input?: string[], max = 6) {
  if (!Array.isArray(input)) return undefined
  const cleaned = input
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter((s) => s.length > 0)
    .slice(0, max)
  return cleaned
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const id = String(event.context.params?.id || '')
  if (!isUUID(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid experiment id' })

  const supabase = await serverSupabaseClient(event)
  const { whatWorked, tryNext, finalize } = bodySchema.parse(await readBody(event).catch(() => ({})))

  const { data: exp, error: expErr } = await supabase
    .from('experiments')
    .select('id,user_id,status,outcome')
    .eq('id', id)
    .eq('user_id', uid)
    .maybeSingle()

  if (expErr) throw createError({ statusCode: 500, statusMessage: expErr.message })
  if (!exp) throw createError({ statusCode: 404, statusMessage: 'Experiment not found' })

  const status = String(exp.status || '')
  if (finalize && status !== 'ended_pending_review') {
    throw createError({ statusCode: 409, statusMessage: `Cannot finalize review in status=${status}` })
  }

  const outcome = (exp.outcome || {}) as any

  const ww = cleanBullets(whatWorked)
  const tn = cleanBullets(tryNext)

  const nextOutcome = {
    ...outcome,
    ...(ww !== undefined ? { what_worked: ww } : null),
    ...(tn !== undefined ? { try_next: tn } : null)
  }

  const patch: any = {
    outcome: nextOutcome,
    updated_at: new Date().toISOString()
  }

  if (finalize) {
    patch.status = 'completed'
  }

  const { data: updated, error: updErr } = await supabase
    .from('experiments')
    .update(patch)
    .eq('id', id)
    .eq('user_id', uid)
    .select('*')
    .single()

  if (updErr) throw createError({ statusCode: 500, statusMessage: updErr.message })

  // best-effort event log
  try {
    await supabase.from('experiment_events').insert({
      user_id: uid,
      experiment_id: id,
      type: finalize ? 'review_finalized' : 'review_updated',
      payload: {
        what_worked_count: Array.isArray(ww) ? ww.length : undefined,
        try_next_count: Array.isArray(tn) ? tn.length : undefined
      }
    })
  } catch (e) {
    console.error('experiment_events insert failed (ignored)', e)
  }

  return { success: true, experiment: updated }
})
