<!-- components/dashboard/WeeklyAiReportCard.vue -->
<template>
  <div
    class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
    <div class="mb-3 flex items-center justify-between gap-2">
      <div>
        <h2 class="text-lg font-semibold text-slate-100 mb-3">
          Weekly AI reflection
        </h2>
        <p class="mt-1 text-[11px] text-slate-400">
          A gentle look at your last 7 days and 2–3 ideas for the week ahead.
        </p>
      </div>
      <button
        class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
        @click="refresh" :disabled="loading">
        <span v-if="loading">Updating…</span>
        <span v-else>Refresh</span>
      </button>
    </div>

    <div v-if="loading" class="text-[11px] text-slate-300">
      Loading weekly reflection…
    </div>

    <div v-else-if="summary" class="max-w-none text-sm leading-relaxed halo-weekly-summary">
      <div v-html="renderedSummary" />
    </div>

    <div v-else class="text-[11px] text-slate-500">
      No weekly reflection yet. Generate the first one from your recent check-ins.
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked'

const supabase = useSupabaseClient()

const summary = ref<string>('')
const loading = ref(false)

const renderedSummary = computed(() =>
  summary.value ? marked.parse(summary.value) : ''
)

async function loadExisting() {
  loading.value = true
  try {
    const today = new Date().toISOString().slice(0, 10)

    const { data: userData } = await supabase.auth.getUser()
    const currentUser = userData.user
    if (!currentUser) {
      summary.value = ''
      return
    }

    const { data } = await supabase
      .from('ai_reports')
      .select('content')
      .eq('user_id', currentUser.id)
      .eq('period', 'weekly')
      .eq('date', today)
      .maybeSingle()

    summary.value = data?.content || ''
  } catch (e) {
    console.error(e)
    summary.value = ''
  } finally {
    loading.value = false
  }
}

async function refresh() {
  loading.value = true
  try {
    const today = new Date().toISOString().slice(0, 10)

    const res = await $fetch<{ summary: string | null }>('/api/ai/weekly-summary', {
      method: 'POST',
      body: { endDate: today }
    })

    summary.value = res.summary || ''
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadExisting()
})
</script>

<style scoped>
.halo-weekly-summary :deep(strong) {
  font-weight: 700;
  color: #6ee7b7; /* emerald-300-ish, para que se note bien */
}
.halo-weekly-summary :deep(em) {
  font-style: italic;
  color: rgba(226, 232, 240, 0.9); /* slate-200-ish */
  opacity: 0.95;
}
</style>
