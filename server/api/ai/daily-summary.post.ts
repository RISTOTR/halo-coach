// server/api/ai/daily-summary.post.ts
import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const bodySchema = z.object({
  date: z.string()
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  if (!config.openaiApiKey) {
    console.error('OPENAI_API_KEY is not set')
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenAI API key is not configured.'
    })
  }

  const { date } = bodySchema.parse(await readBody(event))

  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = await serverSupabaseClient(event)

  const normalizedDate = new Date(date).toISOString().slice(0, 10)

const { data: metrics, error: metricsError } = await supabase
  .from('daily_metrics')
  .select('*')
  .eq('user_id', user.sub)
  .eq('date', normalizedDate)
  .maybeSingle()

if (metricsError) {
  console.error('Metrics fetch error:', metricsError)
}

  const { data: journal } = await supabase
    .from('journal_entries')
    .select('type, content')
    .eq('user_id', user.id)
    .eq('date', date)

  const summaryInput = {
    date,
    metrics,
    journal
  }

  const prompt = `
You are a holistic lifestyle coach. Analyze the following data for one day and give a concise reflection.

Data JSON:
${JSON.stringify(summaryInput, null, 2)}

Write:
1) A short overview of how the day looked (sleep, mood, stress, movement).
2) One or two positive highlights.
3) One or two gentle suggestions for tomorrow.

Keep it friendly, non-judgmental, and under 180 words.
`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'You are a supportive lifestyle and habit coach.' },
        { role: 'user', content: prompt }
      ]
    })
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('OpenAI error:', text)
    throw createError({ statusCode: 500, statusMessage: 'AI request failed' })
  }

  const json = await res.json()
  const summary = json.choices?.[0]?.message?.content ?? 'No summary generated.'

  await supabase.from('ai_reports').insert({
    user_id: user.sub,
    period: 'daily',
    date,
    content: summary
  })

  return { summary }
})
