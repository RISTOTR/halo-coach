// server/api/habits/today.get.ts
import { defineEventHandler, getQuery, createError } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = await serverSupabaseClient(event)
  const query = getQuery(event)

  const day =
    (typeof query.date === 'string' && query.date) ||
    new Date().toISOString().slice(0, 10)

  // 1) Hábitos activos del usuario
  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.sub)
    .eq('archived', false)
    .order('created_at')

  if (habitsError) {
    console.error(habitsError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load habits' })
  }

  // 2) Logs del día
  const { data: logs, error: logsError } = await supabase
    .from('habit_logs')
    .select('habit_id')
    .eq('user_id', user.sub)
    .eq('date', day)

  if (logsError) {
    console.error(logsError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load habit logs' })
  }

  const completedIds = new Set((logs || []).map((l) => l.habit_id))

  const result = (habits || []).map((h) => ({
    ...h,
    completed_today: completedIds.has(h.id)
  }))

  return result
})
