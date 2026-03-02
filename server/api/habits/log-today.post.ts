// server/api/habits/log-today.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  completedHabitIds: z.array(z.string().uuid())
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = await serverSupabaseClient(event)
  const { date, completedHabitIds } = bodySchema.parse(await readBody(event))

  const day = date || new Date().toISOString().slice(0, 10)

  // Optional safety: filter out habit IDs that are not owned by user or archived
  if (completedHabitIds.length) {
    const { data: allowed, error: allowedErr } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', uid)
      .in('id', completedHabitIds)
      .or('archived.is.null,archived.eq.false')

    if (allowedErr) throw createError({ statusCode: 500, statusMessage: allowedErr.message })

    const allowedSet = new Set((allowed || []).map((h) => h.id))
    const filteredIds = completedHabitIds.filter((id) => allowedSet.has(id))

    // Reset the day (delete any existing entries for that date)
    const { error: deleteErr } = await supabase
      .from('habit_entries')
      .delete()
      .eq('user_id', uid)
      .eq('date', day)

    if (deleteErr) throw createError({ statusCode: 500, statusMessage: deleteErr.message })

    // Insert completed
    if (filteredIds.length) {
      const rows = filteredIds.map((habit_id) => ({
        user_id: uid,
        habit_id,
        date: day,
        completed: true
      }))

      const { error: insErr } = await supabase
        .from('habit_entries')
        .insert(rows)

      if (insErr) throw createError({ statusCode: 500, statusMessage: insErr.message })
    }
  } else {
    // If none completed, just clear the day
    const { error: deleteErr } = await supabase
      .from('habit_entries')
      .delete()
      .eq('user_id', uid)
      .eq('date', day)

    if (deleteErr) throw createError({ statusCode: 500, statusMessage: deleteErr.message })
  }

  return { success: true }
})
