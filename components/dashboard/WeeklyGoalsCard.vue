<!-- components/dashboard/WeeklyGoalsCard.vue -->
<template>
  <div
    class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]"
  >
    <!-- Header -->
    <div class="mb-3 flex items-center justify-between gap-2">
      <div>
        <h2 class="text-lg font-semibold text-slate-100 mb-3">
          Weekly goals
        </h2>
        <p class="mt-1 text-[11px] text-slate-400">
          A few gentle focuses for this week. You can change them anytime.
        </p>
      </div>
      <div class="text-[10px] text-slate-400">
        Week starting {{ formattedWeekStart }}
      </div>
    </div>

    <div v-if="loading" class="text-[11px] text-slate-300">
      Loading weekly goals…
    </div>

    <div v-else class="space-y-3 text-[11px]">
      <!-- Goals list -->
      <div class="space-y-2">
        <div
          v-for="(goal, idx) in localGoals"
          :key="idx"
          class="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2"
        >
          <div class="flex items-start gap-2">
            <input
              v-model="goal.title"
              class="mt-0.5 flex-1 border-none bg-transparent text-[11px] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-0"
              placeholder="E.g. 3 short walks, consistent bedtime, nightly reflection…"
            />
            <select
              v-model="goal.status"
              class="rounded-full border border-white/15 bg-slate-950/80 px-2 py-0.5 text-[10px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>

          <!-- Category chips -->
          <div class="mt-2 flex flex-wrap gap-1.5">
            <button
              v-for="cat in categories"
              :key="cat.value"
              type="button"
              @click="goal.category = cat.value"
              class="rounded-full border px-2 py-0.5 text-[10px] transition"
              :class="[
                goal.category === cat.value
                  ? 'border-emerald-400/80 bg-emerald-500/15 text-emerald-100'
                  : 'border-white/15 bg-slate-950/60 text-slate-300 hover:border-emerald-400/60 hover:text-emerald-100'
              ]"
            >
              {{ cat.label }}
            </button>
          </div>
        </div>

        <!-- Add goal button -->
        <button
          class="mt-1 text-[11px] text-emerald-300 hover:underline disabled:opacity-40"
          @click="addGoal"
          :disabled="localGoals.length >= 4"
        >
          + Add goal
        </button>
      </div>

      <!-- Suggestions from Halo -->
      <div class="mt-3 rounded-lg border border-dashed border-white/15 bg-slate-950/60 px-3 py-3">
        <div class="mb-1 flex items-center justify-between">
          <p class="text-[12px] font-medium text-slate-100">
            Gentle suggestions from Halo
          </p>
          <button
            class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-0.5 text-[10px] font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
            @click="fetchSuggestions"
            :disabled="suggestionsLoading"
          >
            <span v-if="suggestionsLoading">Thinking…</span>
            <span v-else>Get suggestions</span>
          </button>
        </div>
        <p class="mb-2 text-[10px] text-slate-400">
          Based on how your week actually felt, Halo can suggest a few gentle goals.
        </p>

        <div v-if="suggestionsError" class="text-[10px] text-red-300">
          {{ suggestionsError }}
        </div>

        <div v-else-if="suggestions.length === 0" class="text-[10px] text-slate-500">
          No suggestions yet. Ask Halo to generate a few.
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="(s, idx) in suggestions"
            :key="idx"
            class="flex items-start justify-between gap-2 rounded-md border border-white/10 bg-slate-900/80 px-2 py-1.5"
          >
            <div>
              <p class="text-[11px] text-slate-100">
                {{ s.title }}
              </p>
              <p class="text-[10px] text-slate-400">
                Category: {{ categoryLabel(s.category) }}
              </p>
            </div>
            <button
              class="mt-0.5 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-100 hover:bg-emerald-500/20"
              @click="addSuggestionAsGoal(s)"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <!-- Footer / save -->
      <div class="mt-3 flex items-center justify-between">
        <div class="text-[11px] text-slate-400">
          {{ statusMessage }}
        </div>
        <button
          class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
          @click="save"
          :disabled="saving"
        >
          <span v-if="saving">Saving…</span>
          <span v-else>Save goals</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient()

type GoalStatus = 'pending' | 'in_progress' | 'done' | 'skipped'
type GoalCategory = 'sleep' | 'movement' | 'mind' | 'stress' | 'habits' | 'other'

interface WeeklyGoalUI {
  title: string
  status: GoalStatus
  category: GoalCategory
}

interface SuggestedGoal {
  title: string
  category: GoalCategory
}

const weekStart = ref<string>('')
const localGoals = ref<WeeklyGoalUI[]>([])

const loading = ref(false)
const saving = ref(false)
const statusMessage = ref('')

const suggestions = ref<SuggestedGoal[]>([])
const suggestionsLoading = ref(false)
const suggestionsError = ref('')

const categories: { value: GoalCategory; label: string }[] = [
  { value: 'sleep', label: 'Sleep' },
  { value: 'movement', label: 'Movement' },
  { value: 'mind', label: 'Mind / Calm' },
  { value: 'stress', label: 'Stress' },
  { value: 'habits', label: 'Habits' },
  { value: 'other', label: 'Other' }
]

const formattedWeekStart = computed(() => {
  if (!weekStart.value) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short'
  }).format(new Date(weekStart.value))
})

function categoryLabel(cat: GoalCategory) {
  return categories.find((c) => c.value === cat)?.label || 'Other'
}

function addGoal() {
  localGoals.value.push({
    title: '',
    status: 'pending',
    category: 'other'
  })
}

function addSuggestionAsGoal(s: SuggestedGoal) {
  if (localGoals.value.length >= 4) return
  localGoals.value.push({
    title: s.title,
    status: 'pending',
    category: s.category || 'other'
  })
}

async function loadCurrentWeek() {
  loading.value = true
  statusMessage.value = ''
  try {
    const today = new Date().toISOString().slice(0, 10)
    const res = await $fetch<{ weekStart: string; goals: any[] }>('/api/goals/weekly', {
      query: { date: today }
    })

    weekStart.value = res.weekStart
    localGoals.value =
      res.goals?.map((g) => ({
        title: g.title as string,
        status: (g.status as GoalStatus) || 'pending',
        category: (g.category as GoalCategory) || 'other'
      })) || []

    if (localGoals.value.length === 0) {
      // Default: 2 empty slots
      localGoals.value = [
        { title: '', status: 'pending', category: 'other' },
        { title: '', status: 'pending', category: 'other' }
      ]
    }
  } catch (e) {
    console.error(e)
    statusMessage.value = 'Could not load weekly goals.'
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  statusMessage.value = ''
  try {
    const today = new Date().toISOString().slice(0, 10)

    const goalsToSend = localGoals.value
      .filter((g) => g.title.trim().length > 0)
      .map((g) => ({
        title: g.title.trim(),
        status: g.status,
        category: g.category
      }))

    const res = await $fetch<{ weekStart: string; goals: any[] }>('/api/goals/weekly', {
      method: 'POST',
      body: {
        date: today,
        goals: goalsToSend
      }
    })

    weekStart.value = res.weekStart
    statusMessage.value = 'Weekly goals saved.'
  } catch (e) {
    console.error(e)
    statusMessage.value = 'Something went wrong saving goals.'
  } finally {
    saving.value = false
  }
}

async function fetchSuggestions() {
  suggestionsLoading.value = true
  suggestionsError.value = ''
  try {
    const today = new Date().toISOString().slice(0, 10)
    const res = await $fetch<{ goals: SuggestedGoal[] }>('/api/ai/weekly-goal-suggestions', {
      method: 'POST',
      body: { endDate: today }
    })

    suggestions.value = res.goals || []
    if (!suggestions.value.length) {
      suggestionsError.value = 'No suggestions available for this week yet.'
    }
  } catch (e) {
    console.error(e)
    suggestionsError.value = 'Could not get suggestions from Halo.'
  } finally {
    suggestionsLoading.value = false
  }
}

onMounted(() => {
  loadCurrentWeek()
})
</script>
