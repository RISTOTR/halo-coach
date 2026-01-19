<!-- components/OnboardingModal.vue -->
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div
      class="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950/90 px-6 py-7 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
    >
      <h1 class="text-xl font-semibold text-white">
        Welcome to Halo
      </h1>

      <p class="mt-2 text-sm text-slate-300">
        A calm, human way to build habits and self-awareness.
      </p>

      <p class="mt-4 text-sm text-slate-200">
        Halo helps you notice patterns in your habits, mood, energy, and rest —
        and reflects them back with gentle guidance, not pressure.
      </p>

      <!-- What Halo is -->
      <div class="mt-5">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-400">
          What Halo is
        </h2>
        <ul class="mt-2 space-y-1.5 text-sm text-slate-200">
          <li>• A <strong>daily check-in</strong>, not a performance tracker</li>
          <li>• A <strong>reflective coach</strong>, not a task manager</li>
          <li>• Focused on <strong>patterns over time</strong>, not perfect days</li>
          <li>• A place where <strong>small wins count</strong></li>
          <li>• Supportive of both <strong>momentum and rest</strong></li>
        </ul>
      </div>

      <!-- What Halo isn't -->
      <div class="mt-4">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-400">
          What Halo isn’t
        </h2>
        <ul class="mt-2 space-y-1.5 text-sm text-slate-300">
          <li>• A “do more” productivity app</li>
          <li>• A streak-obsessed habit punisher</li>
          <li>• A judge of motivation or discipline</li>
          <li>• A system that assumes more effort is always better</li>
        </ul>
      </div>

      <!-- Principle -->
      <div class="mt-5 rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
        <p class="text-sm text-slate-100">
          <strong>Halo is not about doing more.</strong><br />
          It’s about noticing what helps — and adjusting gently.
        </p>
      </div>

      <!-- CTA -->
      <button
        class="mt-6 w-full rounded-full border border-emerald-500/60 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/25"
        @click="$emit('close')"
      >
        Begin gently →
      </button>
    </div>
  </div>
</template>
