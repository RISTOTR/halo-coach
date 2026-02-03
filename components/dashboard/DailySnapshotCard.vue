<!-- components/dashboard/DailySnapshotCard.vue -->
<template>
  <div
    class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]"
  >
    <!-- Header ------------------------------------------------ -->
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-slate-100 mb-3">
          {{ label || "Today’s snapshot" }}
        </h2>
        <p class="mt-1 text-xs text-white/55">
          {{ moodHeadline }}
        </p>
      </div>

      <div class="flex flex-col items-end gap-1 text-right">
        <span class="text-[11px] text-white/40">
          {{ formattedDate }}
        </span>
        <span
          class="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-100"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          {{ dayLabel }}
        </span>
      </div>
    </div>

    <!-- Content ------------------------------------------------ -->
    <div class="grid gap-4 md:grid-cols-2">
      <!-- Mood / Energy block -->
      <div class="flex flex-col justify-between rounded-xl bg-white/5 px-4 py-3">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/70"
            >
              <span class="text-2xl">
                {{ moodEmoji }}
              </span>
            </div>
            <div>
              <p class="text-xs uppercase tracking-[0.16em] text-white/45">
                Mood
              </p>
              <p class="text-sm font-medium text-white">
                {{ moodText }}
              </p>
            </div>
          </div>

          <div class="text-right">
            <p class="text-xs uppercase tracking-[0.16em] text-white/45">
              Energy
            </p>
            <p class="text-lg font-semibold text-white">
              {{ energyScore }}
              <span class="text-[11px] font-normal text-white/45">/ 5</span>
            </p>
          </div>
        </div>

        <!-- Small bar for energy -->
        <div class="mt-3 h-1.5 w-full rounded-full bg-slate-900/70">
          <div
            class="h-full rounded-full bg-emerald-400"
            :style="{ width: `${energyPercent}%` }"
          />
        </div>
      </div>

      <!-- Quick stats -->
      <div class="space-y-3">
        <!-- Sleep -->
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.16em] text-white/45">
              Sleep
            </p>
            <p class="text-sm text-white">
              {{ sleepHours.toFixed(1) }} h
            </p>
          </div>
          <div class="text-right text-xs text-white/50">
            Quality
            <span class="ml-1 font-medium text-white">
              {{ sleepQuality }}%
            </span>
          </div>
        </div>

        <!-- Stress -->
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.16em] text-white/45">
              Stress
            </p>
            <p class="text-sm text-white">
              {{ stressText }}
            </p>
          </div>
          <div class="flex gap-1.5">
            <span
              v-for="n in 5"
              :key="n"
              class="h-1.5 w-5 rounded-full"
              :class="n <= stressLevel ? 'bg-amber-300' : 'bg-slate-800'"
            />
          </div>
        </div>

        <!-- Habits -->
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.16em] text-white/45">
              Habits
            </p>
            <p class="text-sm text-white">
              {{ habitsCompleted }} / {{ habitsTotal }} completed
            </p>
          </div>
          <div class="text-right text-xs text-white/50">
            {{ habitsPercent }}%
            <span class="ml-1 text-white/40">for today</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, withDefaults } from 'vue'

interface Props {
  label?: string
  /** 1–5 */
  moodScore?: number
  /** 1–5 */
  energyScore?: number
  /** horas de sueño */
  sleepHours?: number
  /** 0–100 */
  sleepQuality?: number
  /** 1–5 */
  stressLevel?: number
  habitsCompleted?: number
  habitsTotal?: number
}

const props = withDefaults(defineProps<Props>(), {
  label: "Today’s snapshot",
  moodScore: 4,
  energyScore: 4,
  sleepHours: 7.2,
  sleepQuality: 82,
  stressLevel: 2,
  habitsCompleted: 3,
  habitsTotal: 5
})

const formattedDate = computed(() => {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  }).format(new Date())
})

const dayLabel = computed(() => {
  const ratio =
    props.habitsTotal && props.habitsTotal > 0
      ? props.habitsCompleted / props.habitsTotal
      : 0

  if (ratio >= 0.8) return 'Strong day'
  if (ratio >= 0.4) return 'In progress'
  return 'Plenty of room today'
})

const moodEmoji = computed(() => {
  const score = props.moodScore ?? 3
  if (score >= 5) return '🤩'
  if (score >= 4) return '😊'
  if (score >= 3) return '😌'
  if (score >= 2) return '😕'
  return '😞'
})

const moodText = computed(() => {
  const score = props.moodScore ?? 3
  if (score >= 5) return 'Excellent'
  if (score >= 4) return 'Good'
  if (score >= 3) return 'Neutral'
  if (score >= 2) return 'Low'
  return 'Very low'
})

const moodHeadline = computed(() => {
  const score = props.moodScore ?? 3
  if (score >= 4) return 'Today feels fairly balanced, with room to adjust as you go.'
  if (score >= 3) return 'A steady day with space to adjust.'
  return 'A gentler day — go slow and be kind to yourself.'
})

const energyPercent = computed(() => {
  const score = props.energyScore ?? 3
  return (score / 5) * 100
})

const stressText = computed(() => {
  const level = props.stressLevel ?? 2
  if (level <= 1) return 'Very low'
  if (level === 2) return 'Low'
  if (level === 3) return 'Moderate'
  if (level === 4) return 'High'
  return 'Very high'
})

const habitsPercent = computed(() => {
  if (!props.habitsTotal) return 0
  return Math.round((props.habitsCompleted / props.habitsTotal) * 100)
})

</script>
