import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

const bodySchema = z.object({
  habit_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completed: z.boolean()
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const uid = (user as any).id || (user as any).sub
  if (!uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = await serverSupabaseClient(event)
  const { habit_id, date, completed } = bodySchema.parse(await readBody(event))

  const { data: habit, error: habitErr } = await supabase
    .from('habits')
    .select('id,user_id,archived')
    .eq('id', habit_id)
    .eq('user_id', uid)
    .maybeSingle()


  if (habitErr) throw createError({ statusCode: 500, statusMessage: 'Could not load habit. Please try again.' })
  if (!habit || habit.user_id !== uid) throw createError({ statusCode: 404, statusMessage: 'Habit not found' })
  if (habit.archived) throw createError({ statusCode: 400, statusMessage: 'Habit is archived' })

  if (completed) {
    const { error } = await supabase
      .from('habit_entries')
      .upsert({ user_id: uid, habit_id, date, completed: true }, { onConflict: 'user_id,habit_id,date' })

    if (error) throw createError({ statusCode: 500, statusMessage: 'Could not update habit. Please try again.' })
  } else {
    const { error } = await supabase
      .from('habit_entries')
      .delete()
      .eq('user_id', uid)
      .eq('habit_id', habit_id)
      .eq('date', date)

    if (error) throw createError({ statusCode: 500, statusMessage: 'Could not update habit. Please try again.' })
  }

  return { ok: true }
})
