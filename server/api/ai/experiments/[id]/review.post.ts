import { defineEventHandler, createError, readBody } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import OpenAI from 'openai'

const bodySchema = z.object({
  whatWorked: z.array(z.string().min(1)).max(10).optional(),
  tryNext: z.array(z.string().min(1)).max(10).optional(),
  finalize: z.boolean().optional(),
  subjectiveRating: z
    .enum(['more_stable','slightly_better','no_change','hard_to_maintain','worse'])
    .optional(),
  subjectiveNote: z.string().max(2000).optional()
})

function isUUID(v: string) {
  return /^[0-9a-fA-F-]{36}$/.test(v)
}

function cleanBullets(arr?: string[]) {
  if (!arr) return undefined
  const cleaned = arr
    .map((s) => (s ?? '').trim())
    .filter(Boolean)
    .slice(0, 10)
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
  const body = bodySchema.parse(await readBody(event).catch(() => ({})))

  const what_worked = cleanBullets(body.whatWorked)
  const try_next = cleanBullets(body.tryNext)
  const finalize = body.finalize === true

  const subjective_rating = body.subjectiveRating ?? null
const subjective_note = body.subjectiveNote?.trim() ? body.subjectiveNote.trim() : null

  // Load existing experiment + outcome
  const { data: exp, error: expErr } = await supabase
    .from('experiments')
    .select('id,user_id,status,outcome,end_date,title,lever_ref,target_metric')
    .eq('id', id)
    .eq('user_id', uid)
    .maybeSingle()

  if (expErr) throw createError({ statusCode: 500, statusMessage: expErr.message })
  if (!exp) throw createError({ statusCode: 404, statusMessage: 'Experiment not found' })

  // Only allow finalizing if it was ended
  if (finalize) {
    if (!exp.end_date) {
      throw createError({ statusCode: 409, statusMessage: 'Experiment must be ended before finalizing' })
    }
    if (exp.status !== 'ended_pending_review' && exp.status !== 'completed') {
      throw createError({ statusCode: 409, statusMessage: `Cannot finalize experiment in status=${exp.status}` })
    }
  }

  const currentOutcome = (exp as any).outcome || {}
  const nextOutcome = {
    ...currentOutcome,
    ...(what_worked !== undefined ? { what_worked } : {}),
    ...(try_next !== undefined ? { try_next } : {})
  }

function oneLine(s: string) {
  return s.replace(/\s+/g, ' ').trim()
}

function tonePreset(conf: number | null) {
  if (typeof conf !== 'number' || !Number.isFinite(conf)) return 'uncertain'
  if (conf >= 0.75) return 'confident'
  if (conf >= 0.5) return 'balanced'
  return 'uncertain'
}

function confidenceLabel(score: number | null): 'low' | 'moderate' | 'strong' {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'moderate'
  if (score >= 0.75) return 'strong'
  if (score >= 0.5) return 'moderate'
  return 'low'
}

async function generateConclusion(event: any, args: {
  title?: string | null
  leverRef?: string | null
  targetMetric?: string | null
  alignment?: string | null
  confidenceScore?: number | null
  targetDelta?: number | null
  whatWorked?: string[]
  tryNext?: string[]
}) {
  const config = useRuntimeConfig(event)
  if (!config.openaiApiKey) return null

  const client = new OpenAI({ apiKey: config.openaiApiKey })

  const preset = tonePreset(args.confidenceScore ?? null)

  const prompt = `
Write ONE sentence (max 22 words) as an experiment conclusion.
Tone preset: ${preset}

Rules by tone:
- confident: decisive phrasing ("clear signal", "strongly suggests"), no hedging.
- balanced: moderate phrasing ("seems", "likely"), no overclaims.
- uncertain: cautious phrasing ("early signal", "might"), explicitly acknowledge limited confidence.

General:
- Calm, factual, encouraging. No emojis. No quotes.
- Mention change direction + confidence + one gentle next step.
- Avoid numbers unless essential.

Context:
title: ${args.title ?? ''}
lever: ${args.leverRef ?? ''}
target: ${args.targetMetric ?? ''}
alignment: ${args.alignment ?? 'unclear'}
confidence_score: ${args.confidenceScore ?? 'null'}
target_delta: ${args.targetDelta ?? 'null'}
what_worked: ${(args.whatWorked ?? []).join('; ')}
try_next: ${(args.tryNext ?? []).join('; ')}

Return ONLY the sentence.
`.trim()

  const res = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: [{ role: 'user', content: prompt }]
  })

  const text =
    res.output?.[0]?.content?.[0]?.type === 'output_text'
      ? res.output[0].content[0].text
      : null

  return text ? oneLine(text) : null
}

  const updatePayload: any = {
    outcome: nextOutcome,
    updated_at: new Date().toISOString()
  }

  if (finalize) {
    const o = nextOutcome || {}

    const alignment = (o.alignment ?? 'unclear') as 'aligned' | 'mismatch' | 'unclear'

    const confidenceScore = typeof o.confidence_score === 'number' ? o.confidence_score : null
    const confidence = confidenceLabel(confidenceScore)

    const baseline_from = o.windows?.baseline?.start
    const baseline_to = o.windows?.baseline?.end
    const experiment_from = o.windows?.experiment?.start
    const experiment_to = o.windows?.experiment?.end

    const metrics = o.metrics ?? null
    if (!metrics) {
      throw createError({ statusCode: 409, statusMessage: 'Missing outcome.metrics — end experiment first.' })
    }

    const targetKey = o.target_metric
    const baseline_rows =
      targetKey && metrics?.[targetKey]?.n_baseline != null
        ? Number(metrics[targetKey].n_baseline)
        : 0

    const experiment_rows =
      targetKey && metrics?.[targetKey]?.n_experiment != null
        ? Number(metrics[targetKey].n_experiment)
        : 0

    if (!baseline_from || !baseline_to || !experiment_from || !experiment_to) {
      throw createError({ statusCode: 409, statusMessage: 'Missing outcome windows — end experiment first.' })
    }

    const targetDelta =
      targetKey && metrics?.[targetKey]?.delta != null
        ? Number(metrics[targetKey].delta)
        : null

    const conclusion = await generateConclusion(event, {
      title: exp.title,
      leverRef: exp.lever_ref,
      targetMetric: exp.target_metric,
      alignment,
      confidenceScore,
      targetDelta,
      whatWorked: o.what_worked ?? [],
      tryNext: o.try_next ?? []
    }).catch(() => null)

    updatePayload.outcome = {
      ...nextOutcome,
      conclusion: conclusion ?? null
    }

    const { error: revErr } = await supabase
      .from('experiment_reviews')
      .upsert(
        {
          user_id: uid,
          experiment_id: id,

          subjective_rating,
          subjective_note,

          baseline_rows,
          experiment_rows,

          baseline_from,
          baseline_to,
          experiment_from,
          experiment_to,

          confidence,
          alignment,

          metrics,

          conclusion: conclusion ?? null
        },
        { onConflict: 'user_id,experiment_id' }
      )

    if (revErr) throw createError({ statusCode: 500, statusMessage: revErr.message })

    updatePayload.status = 'completed'
  }

  const { data: updated, error: updErr } = await supabase
    .from('experiments')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', uid)
    .select('id,status,outcome')
    .single()

  if (updErr) throw createError({ statusCode: 500, statusMessage: updErr.message })

  // best-effort event log
  try {
    await supabase.from('experiment_events').insert({
      user_id: uid,
      experiment_id: id,
      type: finalize ? 'finalized' : 'review_updated',
      payload: { what_worked: what_worked ?? null, try_next: try_next ?? null }
    })
  } catch {}

  return { success: true, experiment: updated }
})
