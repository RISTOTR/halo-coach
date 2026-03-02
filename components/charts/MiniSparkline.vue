<template>
  <div class="h-8 w-24 flex items-center justify-center">
    <svg
      v-if="path && points.length > 1"
      viewBox="0 0 100 32"
      class="w-full h-full"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :class="fillStopClassTop" stop-opacity="0.20" />
          <stop offset="100%" :class="fillStopClassBottom" stop-opacity="0.00" />
        </linearGradient>
      </defs>

      <!-- baseline -->
      <line
        x1="0"
        y1="31"
        x2="100"
        y2="31"
        class="stroke-slate-700"
        stroke-width="0.5"
      />

      <!-- area fill -->
      <path
        :d="areaPath"
        :fill="`url(#${gradientId})`"
      />

      <!-- line -->
      <path
        :d="path"
        :class="lineClass"
        fill="none"
        stroke-width="1.5"
        stroke-linejoin="round"
        stroke-linecap="round"
      />

      <!-- last point dot -->
      <circle
        v-if="lastPoint"
        :cx="lastPoint.x"
        :cy="lastPoint.y"
        r="1.6"
        :class="lineClass"
      />
    </svg>

    <span v-else class="text-[10px] text-slate-500">—</span>
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

// Unique per component instance to avoid gradient id collisions
const gradientId = `sparkGrad-${Math.random().toString(36).slice(2, 9)}`

const normalized = computed(() => {
  const pts = props.points
  if (!pts || pts.length < 2) return null

  const values = pts.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)

  // add tiny padding so flat-ish lines don't stick to top/bottom
  const pad = (max - min) * 0.08
  const minP = min - pad
  const maxP = max + pad
  const span = maxP - minP || 1

  const n = pts.length
  const stepX = n > 1 ? 100 / (n - 1) : 0

  const normY = (v: number) => {
    const t = (v - minP) / span
    const y = 31 - t * 28
    return Math.max(1, Math.min(31, y))
  }

  const coords = pts.map((p, i) => {
    const x = i * stepX
    const y = normY(p.value)
    return { x, y }
  })

  return { coords }
})

const path = computed(() => {
  const n = normalized.value
  if (!n) return ''
  return n.coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(' ')
})

const areaPath = computed(() => {
  const n = normalized.value
  if (!n) return ''
  const coords = n.coords
  const first = coords[0]
  const last = coords[coords.length - 1]

  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(' ')

  // Close down to baseline (y=31)
  return `${line} L ${last.x.toFixed(2)} 31 L ${first.x.toFixed(2)} 31 Z`
})

const lastPoint = computed(() => {
  const n = normalized.value
  if (!n) return null
  return n.coords[n.coords.length - 1]
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

// Use same "tone" for fill as line, but via gradient stops
const fillStopClassTop = computed(() => {
  // stop elements don't support Tailwind stroke classes; but they do support text-* if using currentColor.
  // We'll just use a fixed class and rely on inline via currentColor:
  return 'text-white'
})
const fillStopClassBottom = computed(() => 'text-white')
</script>

<style scoped>
/* Use currentColor for gradient stops; we set fill via url() and color via parent class */
stop { stop-color: currentColor; }
</style>
