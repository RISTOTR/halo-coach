<template>
  <div v-if="data?.hasActive" class="rounded-2xl border border-white/10 bg-white/5 p-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
          Experiment in progress
        </div>

        <div class="mt-1 text-sm font-semibold">
          {{ data.experiment?.leverLabel }} → {{ data.experiment?.targetLabel }}
        </div>

        <div class="mt-1 text-xs text-white/60">
          Day {{ data.experiment?.day }} of {{ data.experiment?.recommendedDays }}
          · Started {{ data.experiment?.startDate }}
        </div>
      </div>

      <button
        class="shrink-0 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"
        @click="$emit('open-end-review', data.experiment!.id)"
      >
        End &amp; review
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data } = await useFetch('/api/ai/experiments/active', { key: 'active-experiment' })
defineEmits<{ (e: 'open-end-review', id: string): void }>()
</script>
