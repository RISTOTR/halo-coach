// server/api/goals/weekly.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const bodySchema = z.object({
  date: z.string().optional(), // cualquier día de la semana
  goals: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        status: z.enum(['pending', 'in_progress', 'done', 'skipped']).optional()
      })
    )
    .default([])
})

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
  const { date, goals } = bodySchema.parse(await readBody(event))

  const baseDate = date || new Date().toISOString().slice(0, 10)
  const weekStart = getWeekStart(baseDate)

  // 1) borrar metas anteriores de esa semana
  const { error: delError } = await supabase
    .from('weekly_goals')
    .delete()
    .eq('user_id', user.sub)
    .eq('week_start', weekStart)

  if (delError) {
    console.error(delError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to reset weekly goals' })
  }

  if (goals.length === 0) {
    return { weekStart, goals: [] }
  }

  const rows = goals.map((g) => ({
    user_id: user.sub,
    week_start: weekStart,
    title: g.title,
    description: g.description || null,
    category: g.category || 'other',
    status: g.status || 'pending'
  }))

  const { data, error: insError } = await supabase
    .from('weekly_goals')
    .insert(rows)
    .select('*')

  if (insError) {
    console.error(insError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to save weekly goals' })
  }

  return { weekStart, goals: data || [] }
})
