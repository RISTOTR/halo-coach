<template>
  <div class="rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
    <div class="text-[11px] uppercase tracking-[0.16em] text-white/50">{{ label }}</div>
    <div class="mt-2 text-2xl font-semibold text-white">{{ value }}</div>

    <div
      v-if="showDelta"
      class="mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px]"
      :class="deltaNeutral
        ? 'border-white/10 bg-black/10 text-white/55'
        : 'border-emerald-400/15 bg-emerald-500/10 text-emerald-200'"
    >
      {{ delta }}
    </div>

    <div v-else class="mt-2 text-[11px] text-white/45">
      Weekly pattern
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: string
  delta: string
  showDelta?: boolean
  deltaNeutral?: boolean
}>()
</script>
