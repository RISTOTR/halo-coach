<template>
  <div
    class="rounded-xl border border-white/10 bg-slate-900/90 p-4 text-center"
  >
    <div class="text-[11px] text-slate-400">{{ label }}</div>
    <div class="mt-1 text-lg font-semibold text-slate-100">
      {{ value ?? '–' }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: number | string | null
}>()
</script>
