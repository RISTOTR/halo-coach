<script setup lang="ts">
const { open } = useOnboardingModal()
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-white/10 bg-slate-950/60 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
      <h1 class="text-lg font-semibold text-slate-100">Settings</h1>
      <p class="mt-1 text-sm text-slate-300">
        Personalize Halo and revisit guidance anytime.
      </p>

      <div class="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
        <div>
          <p class="text-sm font-medium text-slate-100">What is Halo?</p>
          <p class="mt-0.5 text-[11px] text-slate-400">
            Reopen the short onboarding overview.
          </p>
        </div>

        <button
          class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-100 hover:bg-emerald-500/20"
          @click="open"
        >
          Open
        </button>
      </div>
    </div>
  </div>
</template>
