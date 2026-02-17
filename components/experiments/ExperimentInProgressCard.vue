<template>
  <div
    v-if="exp && exp.status === 'active'"
    class="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5 lg:px-6 lg:py-6 shadow-[0_18px_45px_rgba(0,0,0,0.45)]"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
          Experiment in progress
        </div>

        <div class="mt-1 text-sm font-semibold">
          {{ exp.leverLabel }} → {{ exp.targetLabel }}
        </div>

        <div class="mt-1 text-xs text-white/60">
          Day {{ exp.day }} of {{ exp.recommendedDays }}
          · Started {{ exp.startDate }}
        </div>
      </div>

      <button
        class="shrink-0 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"
        @click="$emit('open-end-review')"
      >
        End &amp; review
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ exp: any | null }>()
defineEmits<{ (e: 'open-end-review'): void }>()
</script>
