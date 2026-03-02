<template>
  <div class="mx-auto max-w-6xl px-4 py-8 lg:py-10 space-y-8">
    <!-- Header -->
    <section
      class="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-slate-900/90 to-sky-500/20 px-6 py-6 lg:px-8 lg:py-7">
      <div class="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-emerald-400/25 blur-3xl" />
      <div class="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
      <div class="relative">
      <p class="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
        Habits
      </p>
      <h1 class="mt-1 text-2xl lg:text-3xl font-semibold tracking-tight text-white">
        Your habit system
      </h1>
      <p class="mt-1 text-xs text-slate-300">
        Define the small, repeatable actions that support your body, mind, emotions and productivity.
        You’ll see them in your daily check-ins and reports.
      </p>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <!-- Left: list of habits -->
      <div class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-100">
            Active habits
          </h2>
          <span class="text-[11px] text-slate-400">
            {{ activeHabits.length }} active
          </span>
        </div>

        <div v-if="loading" class="text-[11px] text-slate-400">
          Loading habits…
        </div>

        <div v-else-if="errorMessage" class="text-[11px] text-red-300">
          {{ errorMessage }}
        </div>

        <div v-else-if="!activeHabits.length" class="text-[11px] text-slate-400">
          You don’t have any habits yet. Create your first one on the right.
        </div>

        <ul v-else class="space-y-2 text-[11px]">
          <li
            v-for="habit in activeHabits"
            :key="habit.id"
            class="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2"
          >
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-slate-100">
                  {{ habit.name }}
                </span>
                <span
                  class="inline-flex items-center rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]"
                  :class="categoryPillClass(habit.category)"
                >
                  {{ habit.category }}
                </span>
              </div>
              <div class="text-[10px] text-slate-400">
                <span v-if="habit.frequency === 'daily'">
                  Daily · target {{ habit.target_per_week }} days / week
                </span>
                <span v-else>
                  Weekly · target {{ habit.target_per_week }} times / week
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700/60"
                @click="archiveHabit(habit.id)"
              >
                Archive
              </button>
            </div>
          </li>
        </ul>

        <!-- Archived -->
        <div v-if="archivedHabits.length" class="mt-4 border-t border-white/10 pt-3">
          <div class="flex items-center justify-between">
            <h3 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Archived
            </h3>
            <span class="text-[10px] text-slate-500">
              {{ archivedHabits.length }} habit(s)
            </span>
          </div>
          <ul class="mt-2 space-y-1 text-[11px]">
            <li
              v-for="habit in archivedHabits"
              :key="habit.id"
              class="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5"
            >
              <span class="text-slate-400">
                {{ habit.name }}
              </span>
              <button
                type="button"
                class="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
                @click="unarchiveHabit(habit.id)"
              >
                Restore
              </button>
            </li>
          </ul>
        </div>
      </div>

      <!-- Right: create habit -->
      <div class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
        <h2 class="text-sm font-semibold text-slate-100">
          New habit
        </h2>
        <p class="text-slate-400">
          Start with a small, clear behaviour you can repeat consistently.
        </p>

        <form class="mt-2 space-y-3" @submit.prevent="handleCreate">
          <div>
            <label class="mb-1 block text-slate-200">Name</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
              placeholder="e.g. Morning sunlight walk"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-slate-200">Category</label>
              <select
                v-model="form.category"
                required
                class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
              >
                <option disabled value="">Select…</option>
                <option value="body">Body</option>
                <option value="mind">Mind</option>
                <option value="emotion">Emotion</option>
                <option value="productivity">Productivity</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-slate-200">Frequency</label>
              <select
                v-model="form.frequency"
                required
                class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
              >
                <option disabled value="">Select…</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-slate-200">
              Target per week
            </label>
            <input
              v-model.number="form.target_per_week"
              type="number"
              min="1"
              max="7"
              class="w-24 rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
            />
            <p class="mt-1 text-[10px] text-slate-500">
              For daily habits, this is the number of days per week you aim to complete it.
            </p>
          </div>

          <div class="flex items-center justify-between pt-2">
            <div class="text-[10px] text-slate-400 min-h-[1.5rem]">
              {{ formStatus }}
            </div>
            <button
              type="submit"
              class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-60"
              :disabled="creating"
            >
              <span v-if="creating">Creating…</span>
              <span v-else>Create habit</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
type HabitCategory = 'body' | 'mind' | 'emotion' | 'productivity'
type HabitFrequency = 'daily' | 'weekly'

type Habit = {
  id: string
  user_id: string
  name: string
  category: HabitCategory
  frequency: HabitFrequency
  target_per_week: number
  archived: boolean
  created_at: string
}

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const habits = ref<Habit[]>([])
const loading = ref(true)
const errorMessage = ref('')

const form = reactive<{
  name: string
  category: '' | HabitCategory
  frequency: '' | HabitFrequency
  target_per_week: number
}>({
  name: '',
  category: '',
  frequency: '',
  target_per_week: 5
})

const creating = ref(false)
const formStatus = ref('')

// redirect client-side if somehow lands here without user
watch(
  user,
  (u) => {
    if (!u) {
      navigateTo('/auth')
    }
  },
  { immediate: true }
)

onMounted(async () => {
  await loadHabits()
})

const loadHabits = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data: userData } = await supabase.auth.getUser()
    const currentUser = userData.user
    if (!currentUser) {
      errorMessage.value = 'You need to be logged in.'
      loading.value = false
      return
    }

    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      errorMessage.value = 'Failed to load habits.'
    } else {
      habits.value = (data || []) as Habit[]
    }
  } catch (e) {
    console.error(e)
    errorMessage.value = 'Something went wrong loading habits.'
  } finally {
    loading.value = false
  }
}

const activeHabits = computed(() => habits.value.filter((h) => !h.archived))
const archivedHabits = computed(() => habits.value.filter((h) => h.archived))

const handleCreate = async () => {
  formStatus.value = ''
  creating.value = true

  try {
    const { data: userData } = await supabase.auth.getUser()
    const currentUser = userData.user
    if (!currentUser) {
      formStatus.value = 'You need to be logged in.'
      creating.value = false
      return
    }

    if (!form.name.trim() || !form.category || !form.frequency) {
      formStatus.value = 'Please fill in name, category and frequency.'
      creating.value = false
      return
    }

    const payload = {
      user_id: currentUser.id,
      name: form.name.trim(),
      category: form.category,
      frequency: form.frequency,
      target_per_week: form.target_per_week || 5
    }

    const { data, error } = await supabase
      .from('habits')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      console.error(error)
      formStatus.value = 'Failed to create habit.'
      return
    }

    habits.value.push(data as Habit)
    formStatus.value = 'Habit created.'
    form.name = ''
    form.category = ''
    form.frequency = ''
    form.target_per_week = 5
  } catch (e) {
    console.error(e)
    formStatus.value = 'Something went wrong.'
  } finally {
    creating.value = false
  }
}

const archiveHabit = async (id: string) => {
  try {
    const { error } = await supabase
      .from('habits')
      .update({ archived: true })
      .eq('id', id)

    if (error) {
      console.error(error)
      return
    }

    const h = habits.value.find((x) => x.id === id)
    if (h) h.archived = true
  } catch (e) {
    console.error(e)
  }
}

const unarchiveHabit = async (id: string) => {
  try {
    const { error } = await supabase
      .from('habits')
      .update({ archived: false })
      .eq('id', id)

    if (error) {
      console.error(error)
      return
    }

    const h = habits.value.find((x) => x.id === id)
    if (h) h.archived = false
  } catch (e) {
    console.error(e)
  }
}

const categoryPillClass = (category: HabitCategory) => {
  switch (category) {
    case 'body':
      return 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
    case 'mind':
      return 'border-sky-400/50 bg-sky-500/10 text-sky-200'
    case 'emotion':
      return 'border-rose-400/50 bg-rose-500/10 text-rose-200'
    case 'productivity':
      return 'border-amber-400/50 bg-amber-500/10 text-amber-200'
    default:
      return 'border-slate-500/40 bg-slate-800/60 text-slate-200'
  }
}
</script>
