<template>
  <div class="mx-auto max-w-6xl px-4 py-8 lg:py-10 space-y-6">
    <section class="flex items-end justify-between gap-4">
      <div>
        <p class="text-[12px] font-semibold uppercase tracking-[0.24em] text-white/50">
          Experiments
        </p>
        <h1 class="mt-1 text-2xl lg:text-3xl font-semibold text-white">
          History
        </h1>
        <p class="mt-2 text-sm text-white/60">
          Completed, abandoned, and pending reviews.
        </p>
      </div>

      <button
        class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10 disabled:opacity-50"
        :disabled="loading" @click="reload">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </section>

    <section v-if="activeExp" class="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-100/80">
            Active experiment
          </div>

          <div class="mt-1 text-sm font-semibold text-slate-100 truncate">
            {{ activeExp.title || `${activeExp.leverLabel} → ${activeExp.targetLabel}` }}
          </div>

          <div class="mt-1 text-xs text-emerald-100/70">
            Day {{ activeExp.day }} of {{ activeExp.recommendedDays }}
            · Started {{ activeExp.startDate }}
          </div>
        </div>

        <div class="shrink-0 flex items-center gap-2">
          <button
            class="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/15"
            @click="viewActive">
            View
          </button>

          <button
            class="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20"
            @click="confirmEndActive">
            End &amp; review
          </button>
        </div>
      </div>
    </section>


    <div v-if="error" class="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
      {{ error }}
    </div>

    <div v-else-if="loading && !items.length" class="text-sm text-white/60">
      Loading experiments…
    </div>

    <div v-else-if="!items.length" class="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-white/60">
      No past experiments yet.
    </div>



    <section v-else class="grid gap-3">
      <button v-for="it in items" :key="it.id"
        class="text-left rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 hover:bg-slate-950/70"
        @click="open(it.id)">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
              {{ statusLabel(it.status) }}
              <span v-if="it.outcome?.alignment" class="ml-2 normal-case tracking-normal text-white/35">
                · {{ it.outcome.alignment }}
              </span>
            </div>

            <div class="mt-1 text-sm font-semibold text-slate-100 truncate">
              {{ it.title || `${it.leverRef} → ${it.targetMetric}` }}
            </div>

            <div class="mt-1 text-xs text-white/55">
              {{ it.startDate || '—' }} → {{ it.endDate || '—' }}
            </div>
          </div>
          <div v-if="it.outcome?.conclusion" class="mt-1 text-[11px] text-white/45 line-clamp-1">
            {{ it.outcome.conclusion }}
          </div>
          <div class="shrink-0 flex items-center gap-2">
            <span v-if="typeof it.outcome?.confidenceScore === 'number'"
              class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/70">
              conf {{ confidencePill(it.outcome.confidenceScore) }}
            </span>

            <span class="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/60">
              View →
            </span>
          </div>
        </div>
      </button>
    </section>

    <div class="flex items-center justify-between pt-2">
      <button
        class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
        :disabled="loading || offset === 0" @click="prev">
        Prev
      </button>

      <div class="text-[11px] text-white/45">
        Showing {{ offset + 1 }}–{{ offset + items.length }}
      </div>

      <button
        class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50"
        :disabled="loading || !hasMore" @click="next">
        Next
      </button>
    </div>

    <ExperimentDialog v-model="dialogOpen" :flow="expFlow" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ExperimentDialog from '~/components/ExperimentDialog.vue'

type HistoryItem = {
  id: string
  title: string | null
  leverRef: string | null
  targetMetric: string | null
  startDate: string | null
  endDate: string | null
  status: string
  outcome: { alignment: string | null; confidenceScore: number | null; conclusion?: string | null } | null
}

const expFlow = useExperimentFlow()
const dialogOpen = ref(false)

const items = ref<HistoryItem[]>([])
const loading = ref(false)
const error = ref('')
const limit = ref(20)
const offset = ref(0)
const hasMore = ref(false)

const activeExp = computed(() => expFlow.ctx.value.activeExperiment)

const isSubmitting = computed(() => expFlow.state.value === 'submitting_review')

function viewActive() {
  dialogOpen.value = true
  expFlow.dismiss() // back to ready state
  // optionally set a dedicated state if you have it:
  // expFlow.openActive()
}

function confirmEndActive() {
  dialogOpen.value = true
  expFlow.openEndConfirm()
}


function statusLabel(s: string) {
  if (s === 'completed') return 'Completed'
  if (s === 'abandoned') return 'Abandoned'
  if (s === 'ended_pending_review') return 'Pending review'
  return s
}

function confidencePill(score: number) {
  if (score >= 0.75) return 'high'
  if (score >= 0.5) return 'med'
  return 'low'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch('/api/ai/experiments/history', {
      query: { limit: limit.value, offset: offset.value }
    }) as any
    items.value = res.items || []
    hasMore.value = !!res.hasMore

  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || 'Failed to load experiment history.'
    items.value = []
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

function reload() {
  offset.value = 0
  load()
}

async function open(id: string) {
  dialogOpen.value = true
  await expFlow.openReviewById(id)
}

function next() {
  if (!hasMore.value) return
  offset.value += limit.value
  load()
}

function prev() {
  if (offset.value === 0) return
  offset.value = Math.max(0, offset.value - limit.value)
  load()
}

watch(() => expFlow.state.value, (s) => {
  if (s === 'next_focus') reload()
})


onMounted(async () => {
  await expFlow.loadActive()
  await load()
})
</script>
