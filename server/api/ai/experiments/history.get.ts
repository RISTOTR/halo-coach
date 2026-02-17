import { defineEventHandler, getQuery, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(50).optional(),
  offset: z.coerce.number().min(0).optional()
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { limit = 20, offset = 0 } = querySchema.parse(getQuery(event))
  const supabase = await serverSupabaseClient(event)

  const { data, error } = await supabase
    .from('experiments')
    .select(
      [
        'id',
        'title',
        'lever_ref',
        'target_metric',
        'start_date',
        'end_date',
        'status',
        'recommended_days',
        'baseline_days',
        'outcome'
      ].join(',')
    )
    .eq('user_id', uid)
    .neq('status', 'active') // history = completed/abandoned/ended_pending_review (you can remove if you want active too)
    .order('start_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Keep it UI-ready but minimal (no heavy compute)
  const items = (data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    leverRef: r.lever_ref,
    targetMetric: r.target_metric,
    startDate: r.start_date,
    endDate: r.end_date,
    status: r.status,
    outcome: r.outcome
      ? {
          alignment: r.outcome.alignment ?? null,
          confidenceScore: r.outcome.confidence_score ?? null
        }
      : null
  }))

  return { items, limit, offset, hasMore: (data?.length || 0) === limit }
})
