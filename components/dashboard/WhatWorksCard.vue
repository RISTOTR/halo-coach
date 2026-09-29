<script setup lang="ts">
type Signal = {
  lever: string
  leverType: 'numeric' | 'boolean'
  diff: number
  avgGood: number
  avgBase: number
  cohenD: number | null
  confidence: 'learning' | 'moderate' | 'strong'
}

type WhatWorksOut = {
  windowDays: number
  minN: number
  overallConfidence: 'learning' | 'moderate' | 'strong'
  suggestion: string | null
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

function formatValue(lever: string, value: number) {
  if (lever === 'sleep_hours') return `${value.toFixed(1)}h`
  if (lever === 'steps') return `${Math.round(value)} min`
  if (lever === 'outdoor_minutes') return `${Math.round(value)} min`
  if (lever === 'water_liters') return `${value.toFixed(1)} L`
  if (lever === 'habits_rate') return `${Math.round(value * 100)}%`
  if (lever === 'habits_all_done') return `${Math.round(value * 100)}%`
  return `${value.toFixed(2)}`
}

function prettyConfidence(c: 'low' | 'moderate' | 'strong') {
  if (c === 'low') return 'Learning'
  if (c === 'moderate') return 'Moderate'
  return 'Strong'
}

function insightExplanation(lever: string, diff: number) {
  if (lever === 'sleep_hours') {
    return diff >= 0
      ? 'More sleep appears to be associated with better days.'
      : 'Lower sleep appears to be associated with better days.'
  }

  if (lever === 'steps') {
    return diff >= 0
      ? 'More movement appears to be associated with better days.'
      : 'Less movement appears to be associated with better days.'
  }

  if (lever === 'habits_rate') {
    return diff >= 0
      ? 'Higher habit completion appears to be associated with better days.'
      : 'Lower habit completion appears to be associated with better days.'
  }

  if (lever === 'outdoor_minutes') {
    return diff >= 0
      ? 'More outdoor time appears to be associated with better days.'
      : 'Less outdoor time appears to be associated with better days.'
  }

  if (lever === 'water_liters') {
    return diff >= 0
      ? 'Higher hydration appears to be associated with better days.'
      : 'Lower hydration appears to be associated with better days.'
  }

  return 'Halo is comparing this metric on better days versus other days.'
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
          <span v-if="data" class="text-[11px] px-2 py-1 rounded-full border"
            :class="confClass(data.overallConfidence)">
            {{ data.overallConfidence }}
          </span>
        </div>
      </div>

      <button class="text-xs text-white/50 hover:text-white/80 transition" @click="refresh()" :disabled="pending"
        title="Refresh">
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
      <div v-for="s in data.signals" :key="s.lever"
        class="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <div class="text-sm text-white/85 truncate">
              {{ prettyLever(s.lever) }}
            </div>

            <div class="group relative">
              <button type="button"
                class="flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] text-white/50 transition hover:bg-white/10 hover:text-white/80"
                :aria-label="`Why this insight about ${prettyLever(s.lever)}`">
                ?
              </button>

              <div
                class="pointer-events-none absolute left-0 top-7 z-30 hidden w-72 rounded-xl border border-white/10 bg-slate-950/95 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.55)] group-hover:block">
                <div class="text-[11px] uppercase tracking-[0.18em] text-white/40">
                  Why this insight
                </div>

                <div class="mt-2 text-sm font-medium text-white/85">
                  {{ prettyLever(s.lever) }}
                </div>
                <div class="mt-2 text-[12px] leading-5 text-white/55">
                  {{ insightExplanation(s.lever, s.diff) }}
                </div>

                <div class="mt-2 text-[12px] leading-5 text-white/65">
                  On your better days, {{ prettyLever(s.lever).toLowerCase() }}
                  averaged <span class="text-white/85">{{ formatValue(s.lever, s.avgGood) }}</span>.
                </div>

                <div class="mt-1 text-[12px] leading-5 text-white/65">
                  On other days, it averaged
                  <span class="text-white/85">{{ formatValue(s.lever, s.avgBase) }}</span>.
                </div>

                <div class="mt-2 flex items-center justify-between text-[12px]">
                  <span class="text-white/45">Difference</span>
                  <span :class="s.diff >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                    {{ prettyDiff(s.lever, s.diff) }}
                  </span>
                </div>

                <div class="mt-1 flex items-center justify-between text-[12px]">
                  <span class="text-white/45">Confidence</span>
                  <span class="text-white/75">
                    {{ prettyConfidence(s.confidence) }}
                  </span>
                </div>
              </div>
            </div>

            <span class="text-[10px] px-2 py-0.5 rounded-full border" :class="confClass(s.confidence)">
              {{ prettyConfidence(s.confidence) }}
            </span>
          </div>

          <div class="mt-0.5 text-[12px] text-white/45">
            {{ effectLabel(s.diff) }}
          </div>
        </div>

        <div class="ml-3 shrink-0 text-sm font-semibold" :class="s.diff >= 0 ? 'text-emerald-300' : 'text-rose-300'">
          {{ prettyDiff(s.lever, s.diff) }}
        </div>
      </div>

      <div
        v-if="data?.suggestion"
        class="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2"
      >
        <div class="text-[11px] uppercase tracking-[0.18em] text-emerald-200/70">
          Suggested focus
        </div>
        <div class="mt-1 text-sm text-emerald-100/90">
          {{ data.suggestion }}
        </div>
      </div>

      <div class="pt-1 text-[11px] text-white/35">
        Based on last {{ data.windowDays }} days · min n={{ data.minN }}
      </div>
    </div>
  </div>
</template>