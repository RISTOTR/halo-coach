import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { computeExperimentReview } from '~/server/utils/experimentReview'

const bodySchema = z.object({
  subjectiveRating: z.enum(['more_stable', 'slightly_better', 'no_change', 'hard_to_maintain', 'worse']),
  subjectiveNote: z.string().max(2000).optional()
})

function signForMetric(metric: string) {
  // + is better for these
  if (metric === 'mood' || metric === 'energy' || metric === 'sleep_hours' || metric === 'outdoor_minutes' || metric === 'water_liters' || metric === 'steps') return +1
  // - is better for stress
  if (metric === 'stress') return -1
  return +1
}

function computeAlignment(args: {
  subjectiveRating: 'more_stable'|'slightly_better'|'no_change'|'hard_to_maintain'|'worse'
  targetMetric: string
  metrics: any
}): 'aligned' | 'mismatch' | 'unclear' {
  const m = args.metrics?.[args.targetMetric]
  if (!m) return 'unclear'

  const volDeltaPct = typeof m.volDeltaPct === 'number' ? m.volDeltaPct : null
  const meanDelta = typeof m.deltaAbs === 'number' ? m.deltaAbs : null

  // Stability signal (secondary)
  const objectiveStable = (volDeltaPct != null && volDeltaPct <= -5)
  const objectiveUnstable = (volDeltaPct != null && volDeltaPct >= 5)

  // Improvement signal (primary) — direction depends on metric
  const dir = signForMetric(args.targetMetric)
  const objectiveBetter = meanDelta != null && (meanDelta * dir) >= 0.3
  const objectiveWorse  = meanDelta != null && (meanDelta * dir) <= -0.3

  const objectivePositive = objectiveBetter || objectiveStable
  const objectiveNegative = objectiveWorse || objectiveUnstable

  const subjectivePositive = args.subjectiveRating === 'more_stable' || args.subjectiveRating === 'slightly_better'
  const subjectiveNegative = args.subjectiveRating === 'worse'

  if (objectivePositive && subjectivePositive) return 'aligned'
  if (objectiveNegative && subjectiveNegative) return 'aligned'
  if (objectivePositive && subjectiveNegative) return 'mismatch'
  if (objectiveNegative && subjectivePositive) return 'mismatch'
  return 'unclear'
}


export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = await serverSupabaseClient(event)
  const body = bodySchema.parse(await readBody(event))

  const id = (event.context.params?.id || '').toString()
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid experiment id' })
  }

  const { data: exp, error: expErr } = await supabase
    .from('experiments')
    .select('id,user_id,status,title,target_metric,start_date,end_date,baseline_days')
    .eq('id', id)
    .eq('user_id', uid)
    .maybeSingle()

  if (expErr) throw createError({ statusCode: 500, statusMessage: expErr.message })
  if (!exp) throw createError({ statusCode: 404, statusMessage: 'Experiment not found' })

  // NEW: lifecycle guards
  if (exp.status === 'abandoned') {
    throw createError({ statusCode: 409, statusMessage: 'Cannot review an abandoned experiment.' })
  }
  if (exp.status === 'completed') {
    throw createError({ statusCode: 409, statusMessage: 'Experiment already reviewed/completed.' })
  }
  if (!exp.end_date) {
    throw createError({ statusCode: 409, statusMessage: 'Experiment has no end_date. End it first.' })
  }

  // NEW: prevent duplicate reviews
  const { data: existingReview, error: existErr } = await supabase
    .from('experiment_reviews')
    .select('id,created_at')
    .eq('user_id', uid)
    .eq('experiment_id', exp.id)
    .limit(1)
    .maybeSingle()

  if (existErr) throw createError({ statusCode: 500, statusMessage: existErr.message })
  if (existingReview) {
    throw createError({ statusCode: 409, statusMessage: 'A review already exists for this experiment.' })
  }

  // Compute objective review
  const result = await computeExperimentReview({
    supabase,
    userId: uid,
    startDate: exp.start_date,
    endDate: exp.end_date,
    baselineDays: exp.baseline_days
  })

  if (!result.ok) {
    return {
      success: false,
      ok: false,
      reason: result.reason,
      required: result.required,
      windows: result.windows,
      baselineRows: result.baselineRows,
      experimentRows: result.experimentRows
    }
  }

  const alignment = computeAlignment({
    subjectiveRating: body.subjectiveRating,
    targetMetric: exp.target_metric,
    metrics: result.metrics
  })

  const { data: saved, error: insErr } = await supabase
    .from('experiment_reviews')
    .insert({
      user_id: uid,
      experiment_id: exp.id,

      subjective_rating: body.subjectiveRating,
      subjective_note: body.subjectiveNote ?? null,

      baseline_rows: result.sample.baselineRows,
      experiment_rows: result.sample.experimentRows,

      baseline_from: result.windows.baselineFrom,
      baseline_to: result.windows.baselineTo,
      experiment_from: result.windows.start,
      experiment_to: result.windows.end,

      confidence: result.confidence,
      alignment,

      metrics: result.metrics
    })
    .select('*')
    .single()

  if (insErr) throw createError({ statusCode: 500, statusMessage: insErr.message })

  const { error: updErr } = await supabase
    .from('experiments')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', exp.id)
    .eq('user_id', uid)

  if (updErr) throw createError({ statusCode: 500, statusMessage: updErr.message })

  return {
    success: true,
    ok: true,
    experiment: { id: exp.id, title: exp.title, targetMetric: exp.target_metric, start: exp.start_date, end: exp.end_date },
    review: saved,
    computed: result
  }
})
