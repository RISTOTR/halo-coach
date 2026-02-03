import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const bodySchema = z.object({
  title: z.string().min(1),
  leverType: z.enum(['metric', 'habit', 'custom']),
  leverRef: z.string().optional(),
  targetMetric: z.enum(['energy', 'stress', 'mood', 'sleep_hours', 'steps', 'water_liters', 'outdoor_minutes']).default('energy'),

  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),

  baselineDays: z.number().int().min(7).max(90).optional(),
  recommendedDays: z.number().int().min(3).max(60).optional(),

  hypothesis: z.string().optional(),
  effortEstimate: z.enum(['low', 'moderate', 'high']).optional(),
  expectedImpact: z.enum(['low', 'moderate', 'high']).optional(),
  confidence: z.enum(['low', 'moderate', 'strong']).optional(),

  // NEW
  replaceActive: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = await serverSupabaseClient(event)
  const body = bodySchema.parse(await readBody(event))

  // Enforce single active experiment (with optional replace)
  const { data: active, error: activeErr } = await supabase
    .from('experiments')
    .select('id,title,start_date,status')
    .eq('user_id', uid)
    .eq('status', 'active')
    .is('end_date', null)
    .order('start_date', { ascending: false })
    .limit(1)

  if (activeErr) throw createError({ statusCode: 500, statusMessage: activeErr.message })

  const today = new Date().toISOString().slice(0, 10)

  if (active && active.length) {
    if (!body.replaceActive) {
      throw createError({
        statusCode: 409,
        statusMessage: 'An active experiment already exists.',
        data: { activeExperiment: active[0] }
      })
    }

    // Replace flow: abandon the active experiment
    const { error: abandonErr } = await supabase
      .from('experiments')
      .update({
        status: 'abandoned',
        end_date: today,
        updated_at: new Date().toISOString()
      })
      .eq('id', active[0].id)
      .eq('user_id', uid)
      .eq('status', 'active')

    if (abandonErr) throw createError({ statusCode: 500, statusMessage: abandonErr.message })
  }

  // Guard: if leverType is habit, require leverRef and it must be a uuid
  if (body.leverType === 'habit') {
    if (!body.leverRef || !/^[0-9a-fA-F-]{36}$/.test(body.leverRef)) {
      throw createError({ statusCode: 400, statusMessage: 'leverRef must be a habit uuid when leverType=habit' })
    }

    const { data: habit, error: habitErr } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', uid)
      .eq('id', body.leverRef)
      .or('archived.is.null,archived.eq.false')
      .maybeSingle()

    if (habitErr) throw createError({ statusCode: 500, statusMessage: habitErr.message })
    if (!habit) throw createError({ statusCode: 400, statusMessage: 'Invalid habit (not found or archived).' })
  }

  // Guard: if leverType is metric, leverRef should be one of daily_metrics columns you track
  if (body.leverType === 'metric') {
    const allowed = new Set(['sleep_hours', 'steps', 'water_liters', 'outdoor_minutes', 'mood', 'energy', 'stress'])
    if (!body.leverRef || !allowed.has(body.leverRef)) {
      throw createError({ statusCode: 400, statusMessage: 'leverRef must be a valid metric when leverType=metric' })
    }
  }

  const startDate = body.startDate || today

  const insertRow = {
    user_id: uid,
    status: 'active',
    title: body.title,
    lever_type: body.leverType,
    lever_ref: body.leverRef || null,
    target_metric: body.targetMetric,
    start_date: startDate,
    baseline_days: body.baselineDays ?? 30,
    recommended_days: body.recommendedDays ?? 7,
    hypothesis: body.hypothesis ?? null,
    effort_estimate: body.effortEstimate ?? 'moderate',
    expected_impact: body.expectedImpact ?? 'moderate',
    confidence: body.confidence ?? 'low'
  }

  const { data: created, error: insErr } = await supabase
    .from('experiments')
    .insert(insertRow)
    .select('*')
    .single()

  if (insErr) throw createError({ statusCode: 500, statusMessage: insErr.message })

  return { success: true, experiment: created }
})
