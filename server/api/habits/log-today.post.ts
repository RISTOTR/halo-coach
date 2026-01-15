// server/api/habits/log-today.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const bodySchema = z.object({
  date: z.string().optional(), // YYYY-MM-DD, opcional
  completedHabitIds: z.array(z.string()) // lista final de los completados
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = await serverSupabaseClient(event)
  const { date, completedHabitIds } = bodySchema.parse(await readBody(event))

  const day = date || new Date().toISOString().slice(0, 10)

  // 1) Borramos todos los logs del día para ese usuario
  const { error: deleteError } = await supabase
    .from('habit_logs')
    .delete()
    .eq('user_id', user.sub)
    .eq('date', day)

  if (deleteError) {
    console.error(deleteError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to reset habit logs' })
  }

  // 2) Insertamos los completados (si hay)
  if (completedHabitIds.length > 0) {
    const rows = completedHabitIds.map((habitId) => ({
      user_id: user.sub,
      habit_id: habitId,
      date: day,
      completed: true
    }))

    const { error: insertError } = await supabase
      .from('habit_logs')
      .insert(rows)

    if (insertError) {
      console.error(insertError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to insert habit logs' })
    }
  }

  return { success: true }
})
