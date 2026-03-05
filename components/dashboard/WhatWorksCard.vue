<script setup lang="ts">
type Signal = {
  lever: string
  leverType: 'numeric' | 'boolean'
  diff: number
  avgGood: number
  avgBase: number
  cohenD: number | null
  confidence: 'low' | 'moderate' | 'strong'
}

type WhatWorksOut = {
  windowDays: number
  minN: number
  overallConfidence: 'low' | 'moderate' | 'strong'
  signals: Signal[]
}

const props = defineProps<{
  windowDays?: number
  minN?: number
}>()

const windowDays = props.windowDays ?? 30
const minN = props.minN ?? 4

const { data, pending, error, refresh } = await useFetch<WhatWorksOut>('/api/what-works', {
  query: { windowDays, minN },
})

function confClass(c: WhatWorksOut['overallConfidence'] | Signal['confidence']) {
  if (c === 'strong') return 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
  if (c === 'moderate') return 'border-white/15 bg-white/5 text-white/70'
  return 'border-white/10 bg-white/5 text-white/50'
}

function prettyLever(lever: string) {
  if (lever === 'sleep_hours') return 'Sleep'
  if (lever === 'steps') return 'Movement (min)'
  if (lever === 'water_liters') return 'Water'
  if (lever === 'outdoor_minutes') return 'Outdoor time'
  if (lever === 'habits_rate') return 'Habits completion'
  if (lever === 'habits_all_done') return 'All habits done'
  if (lever === 'habits_done') return 'Habits done'
  if (lever === 'habits_total') return 'Habits planned'
  return lever
}

function prettyDiff(lever: string, diff: number) {
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : ''
  const abs = Math.abs(diff)

  if (lever === 'sleep_hours') return `${sign}${abs.toFixed(1)}h`
  if (lever === 'steps') return `${sign}${Math.round(abs)} min`
  if (lever === 'outdoor_minutes') return `${sign}${Math.round(abs)} min`
  if (lever === 'water_liters') return `${sign}${abs.toFixed(1)} L`
  if (lever === 'habits_rate') return `${sign}${Math.round(abs * 100)}%`
  if (lever === 'habits_all_done') return `${sign}${Math.round(abs * 100)}%`
  return `${sign}${abs.toFixed(2)}`
}

function effectLabel(diff: number) {
  if (diff > 0) return 'better on good days'
  if (diff < 0) return 'lower on good days'
  return 'no change'
}
</script>

<template>
  <div class="rounded-2xl border border-white/10 bg-slate-950/60 p-5 shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-[11px] uppercase tracking-[0.22em] text-white/50">
          Insights
        </div>
        <div class="mt-1 flex items-center gap-2">
          <h3 class="text-sm font-semibold tracking-tight text-white">
            🧠 What Works For You
          </h3>
          <span
            v-if="data"
            class="text-[11px] px-2 py-1 rounded-full border"
            :class="confClass(data.overallConfidence)"
          >
            {{ data.overallConfidence }}
          </span>
        </div>
      </div>

      <button
        class="text-xs text-white/50 hover:text-white/80 transition"
        @click="refresh()"
        :disabled="pending"
        title="Refresh"
      >
        ↻
      </button>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="mt-5 space-y-3">
      <div class="h-4 w-2/3 rounded bg-white/5"></div>
      <div class="h-4 w-1/2 rounded bg-white/5"></div>
      <div class="h-4 w-3/5 rounded bg-white/5"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="mt-5 text-sm text-red-300/80">
      Couldn’t load insights. <button class="underline" @click="refresh()">Try again</button>
    </div>

    <!-- Empty -->
    <div v-else-if="!data?.signals?.length" class="mt-5 text-sm text-white/55">
      Not enough consistent data yet.
      <div class="mt-2 text-[12px] text-white/40">
        Keep logging for a few more days — Halo will start spotting patterns.
      </div>
    </div>

    <!-- Content -->
    <div v-else class="mt-5 space-y-3">
      <div
        v-for="s in data.signals"
        :key="s.lever"
        class="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <div class="text-sm text-white/85 truncate">
              {{ prettyLever(s.lever) }}
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full border"
              :class="confClass(s.confidence)">
              {{ s.confidence }}
            </span>
          </div>
          <div class="mt-0.5 text-[12px] text-white/45">
            {{ effectLabel(s.diff) }}
          </div>
        </div>

        <div
          class="ml-3 shrink-0 text-sm font-semibold"
          :class="s.diff >= 0 ? 'text-emerald-300' : 'text-rose-300'"
        >
          {{ prettyDiff(s.lever, s.diff) }}
        </div>
      </div>

      <div class="pt-1 text-[11px] text-white/35">
        Based on last {{ data.windowDays }} days · min n={{ data.minN }}
      </div>
    </div>
  </div>
</template>