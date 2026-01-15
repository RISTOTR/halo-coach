<template>
  <div class="rounded-xl border border-white/10 bg-slate-900/90 p-4">
    <h3 class="text-sm font-semibold text-slate-100 mb-2">
      {{ title }}
    </h3>

    <div v-if="!points || points.length === 0" class="text-[11px] text-slate-400">
      No data.
    </div>

    <MiniSparkline
      v-else
      :points="points"
      class="h-20 w-full"
    />
  </div>
</template>

<script setup lang="ts">
import MiniSparkline from '~/components/charts/MiniSparkline.vue'

defineProps<{
  title: string
  points: { time: number; value: number | null }[]
}>()
</script>
