// server/api/goals/weekly.get.ts
import { defineEventHandler, getQuery, createError } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay() // 0=Sun, 1=Mon, ...
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = await serverSupabaseClient(event)
  const query = getQuery(event)

  const baseDate =
    (typeof query.date === 'string' && query.date) ||
    new Date().toISOString().slice(0, 10)

  const weekStart = getWeekStart(baseDate)

  const { data, error } = await supabase
    .from('weekly_goals')
    .select('*')
    .eq('user_id', user.sub)
    .eq('week_start', weekStart)
    .order('created_at')

  if (error) {
    console.error(error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load weekly goals' })
  }

  return {
    weekStart,
    goals: data || []
  }
})
