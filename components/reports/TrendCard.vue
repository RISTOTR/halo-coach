<template>
  <div class="rounded-2xl border border-white/10 bg-black/10 p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="text-sm font-semibold text-slate-100">{{ title }}</div>
        <div class="mt-0.5 text-[11px] text-white/50">{{ hint }}</div>
      </div>
    </div>

    <div class="mt-3">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; hint: string }>()
</script>
