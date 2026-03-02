import { defineEventHandler, getQuery, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

const uid = (user as any).id || (user as any).sub
if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })


  const supabase = await serverSupabaseClient(event)
  const { date } = querySchema.parse(getQuery(event))

  // Fetch habits
 const { data: habits, error: habitsErr } = await supabase
  .from('habits')
  .select('id,user_id,name,category,frequency,target_per_week,created_at,archived')
  .eq('user_id', uid)
  .or('archived.is.null,archived.eq.false')
  .order('created_at', { ascending: true })

  if (habitsErr) throw createError({ statusCode: 500, statusMessage: habitsErr.message })

  // Fetch entries for that date
  const { data: entries, error: entriesErr } = await supabase
    .from('habit_entries')
    .select('habit_id,completed')
    .eq('user_id', uid)
    .eq('date', date)

  if (entriesErr) throw createError({ statusCode: 500, statusMessage: entriesErr.message })

  const completedSet = new Set(
    (entries || []).filter((e) => e.completed !== false).map((e) => e.habit_id)
  )

  const result = (habits || []).map((h) => ({
    ...h,
    completed_today: completedSet.has(h.id)
  }))

  return result
})
