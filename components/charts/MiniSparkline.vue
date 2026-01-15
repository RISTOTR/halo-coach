<template>
  <div class="h-8 w-24 flex items-center justify-center">
    <svg
      v-if="path && points.length > 1"
      viewBox="0 0 100 32"
      class="w-full h-full"
      preserveAspectRatio="none"
    >
      <!-- baseline -->
      <line
        x1="0"
        y1="31"
        x2="100"
        y2="31"
        class="stroke-slate-700"
        stroke-width="0.5"
      />
      <path
        :d="path"
        :class="lineClass"
        fill="none"
        stroke-width="1.5"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    </svg>
    <span v-else class="text-[10px] text-slate-500">
      —
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type SparkPoint = {
  time: number
  value: number
}

const props = defineProps<{
  points: SparkPoint[]
}>()

const path = computed(() => {
  const pts = props.points
  if (!pts || pts.length < 2) return ''

  const values = pts.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  const n = pts.length
  const stepX = n > 1 ? 100 / (n - 1) : 0

  const normY = (v: number) => {
    const t = (v - min) / span
    const y = 31 - t * 28 // dejamos algo de margen
    return Math.max(1, Math.min(31, y))
  }

  return pts
    .map((p, i) => {
      const x = i * stepX
      const y = normY(p.value)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
})

const lineClass = computed(() => {
  const pts = props.points
  if (!pts || pts.length < 2) return 'stroke-slate-400'
  const first = pts[0].value
  const last = pts[pts.length - 1].value
  if (last > first) return 'stroke-emerald-400'
  if (last < first) return 'stroke-red-400'
  return 'stroke-slate-400'
})
</script>
