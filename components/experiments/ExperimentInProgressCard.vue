<template>
  <div
    v-if="exp && exp.status === 'active'"
    class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.45)]"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
          Experiment in progress
        </div>

        <div class="mt-1 text-sm font-semibold text-slate-100 truncate">
          {{ exp.title || `${exp.leverLabel} → ${exp.targetLabel}` }}
        </div>

        <div class="mt-1 text-xs text-white/55">
          {{ exp.leverLabel }} → {{ exp.targetLabel }}
          · Day {{ exp.day }} of {{ exp.recommendedDays }}
          · Started {{ exp.startDate }}
        </div>
      </div>

      <button
        type="button"
        class="shrink-0 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/15"
        :disabled="ending"
        @click="$emit('endReview', exp.id)"
      >
        <span v-if="ending">Ending…</span>
        <span v-else>End &amp; review</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
type ActiveExperiment = {
  id: string
  title: string | null
  leverRef: string
  leverLabel: string
  targetMetric: string
  targetLabel: string
  startDate: string
  recommendedDays: number
  day: number
  status: 'active'
}

defineProps<{
  exp: ActiveExperiment | null
  ending?: boolean
}>()

defineEmits<{ (e: 'endReview', id: string): void }>()
</script>
