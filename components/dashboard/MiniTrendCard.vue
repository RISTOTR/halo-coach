<template>
  <div class="rounded-xl border border-white/10 bg-slate-900/90 p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="text-sm font-semibold text-slate-100">
          {{ title }}
        </h3>
        <p class="mt-0.5 text-[11px] text-white/45">
          {{ subtitle }}
        </p>
      </div>

      <div class="shrink-0 text-right">
        <div class="text-sm font-semibold text-slate-100">
          {{ formattedLast }}
        </div>

        <div
          class="mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]"
          :class="deltaPillClass"
        >
          {{ formattedDelta }}
        </div>
      </div>
    </div>

    <div v-if="!hasEnoughData" class="mt-3 rounded-lg border border-white/10 bg-black/10 p-3">
      <div class="text-[11px] text-slate-200">
        {{ emptyTitle }}
      </div>
      <div class="mt-1 text-[11px] text-white/55">
        {{ emptyText }}
      </div>
    </div>

    <MiniSparkline
      v-else
      :points="cleanPoints"
      class="mt-3 h-20 w-full"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MiniSparkline from '~/components/charts/MiniSparkline.vue'

type Point = { time: number; value: number | null }

const props = defineProps<{
  title: string
  points: Point[]
}>()

const cleanPoints = computed(() => (props.points || []).filter(p => typeof p.value === 'number') as { time: number; value: number }[])

const hasEnoughData = computed(() => cleanPoints.value.length >= 3)

const firstValue = computed(() => cleanPoints.value.length ? cleanPoints.value[0].value : null)
const lastValue = computed(() => cleanPoints.value.length ? cleanPoints.value[cleanPoints.value.length - 1].value : null)
const prevValue = computed(() => cleanPoints.value.length >= 2 ? cleanPoints.value[cleanPoints.value.length - 2].value : null)
const deltaValue = computed(() => (prevValue.value == null || lastValue.value == null) ? null : lastValue.value - prevValue.value)


const lowerIsBetter = computed(() => props.title.toLowerCase() === 'stress')

const subtitle = computed(() => {
  if (!cleanPoints.value.length) return 'No check-ins yet'
  if (!hasEnoughData.value) return `Only ${cleanPoints.value.length} day(s) of data`
  return lowerIsBetter.value ? 'Lower is better' : 'Higher is better'
})

function fmt(n: number, title: string) {
  // basic formatting: sleep -> 1 decimal + "h"
  const t = title.toLowerCase()
  if (t.includes('sleep')) return `${n.toFixed(1)}h`
  // mood/stress are usually 0-10 ints; show as integer if close
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n))
  return n.toFixed(1)
}

const formattedLast = computed(() => {
  if (lastValue.value == null) return '—'
  return fmt(lastValue.value, props.title)
})

const formattedDelta = computed(() => {
  if (deltaValue.value == null) return '—'
  const sign = deltaValue.value > 0 ? '+' : ''
  return `${sign}${fmt(deltaValue.value, props.title)}`
})

const deltaPillClass = computed(() => {
  // For stress: negative delta is "good" (improving)
  const d = deltaValue.value
  if (d == null) return 'border-white/10 bg-black/10 text-white/55'

  const good = lowerIsBetter.value ? d < 0 : d > 0
  const bad = lowerIsBetter.value ? d > 0 : d < 0

  if (good) return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
  if (bad) return 'border-red-400/20 bg-red-500/10 text-red-200'
  return 'border-white/10 bg-black/10 text-white/55'
})

const emptyTitle = computed(() => {
  if (!cleanPoints.value.length) return 'No data yet'
  return 'Not enough data'
})

const emptyText = computed(() => {
  if (!cleanPoints.value.length) return 'Complete a daily check-in to start tracking patterns.'
  return 'Add a couple more check-ins to see a meaningful weekly pattern.'
})
</script>
