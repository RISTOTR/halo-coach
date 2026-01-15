<template>
  <main class="space-y-10">
    <!-- HERO -->
    <section
      class="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-8"
    >
      <div
        class="pointer-events-none absolute inset-0 opacity-50
               bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),transparent_55%),_radial-gradient(circle_at_30%_40%,_rgba(16,185,129,0.18),transparent_60%)]"
      />
      <div class="relative z-10 space-y-3">
        <h1 class="text-2xl font-semibold tracking-tight text-slate-100">
          The science behind Halo
        </h1>
        <p class="max-w-2xl text-sm text-slate-300">
          A calm, evidence-informed approach to healthspan, resilience, and daily
          practices that support a longer, healthier life.
        </p>
      </div>
    </section>

    <!-- CORE PHILOSOPHY -->
    <section class="space-y-4 rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <h2 class="text-lg font-semibold text-slate-100">Our philosophy</h2>
      <p class="text-sm text-slate-300 leading-relaxed">
        Halo is built around the idea that small, consistent behaviors shape our long-term
        healthspan. Feeling better, aging better, and thinking clearly are emergent
        properties of how we sleep, how we manage stress, how we connect with others,
        and how we treat our body and mind on ordinary days.
      </p>

      <p class="text-sm text-slate-300 leading-relaxed">
        This app avoids extremes. No punishment, no “all-or-nothing”. The focus is on
        awareness, positive direction, and sustainable habits supported by clear data
        and gentle AI coaching.
      </p>
    </section>

    <!-- TELOMERE EFFECT -->
    <section class="space-y-4 rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <h2 class="text-lg font-semibold text-slate-100">Inspired by the research</h2>

      <p class="text-sm text-slate-300 leading-relaxed">
        A major influence behind Halo’s holistic model is the book
        <span class="font-semibold text-slate-100">“The Telomere Effect”</span> by
        Elizabeth Blackburn and Elissa Epel. Their work highlights how lifestyle
        factors—sleep quality, chronic stress, mindset, social connection, and daily
        habits—directly shape the biological markers of aging.
      </p>

      <p class="text-sm text-slate-300 leading-relaxed">
        The message is simple: taking care of our inner environment changes how our
        cells behave. Small daily choices matter more than heroic interventions.
      </p>
    </section>

    <!-- FOUR PILLARS -->
    <section class="space-y-6">
      <h2 class="text-lg font-semibold text-slate-100">The four pillars</h2>

      <div class="grid gap-4 md:grid-cols-2">
        <!-- BODY -->
        <div class="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <h3 class="text-base font-semibold text-emerald-300">Body</h3>
          <p class="mt-2 text-sm text-slate-300 leading-relaxed">
            Sleep, movement, hydration, recovery, light exposure.  
            The physical foundation of energy and healthspan.
          </p>
        </div>

        <!-- MIND -->
        <div class="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <h3 class="text-base font-semibold text-sky-300">Mind</h3>
          <p class="mt-2 text-sm text-slate-300 leading-relaxed">
            Attention, learning, focus, and cognitive load.  
            Practices that strengthen clarity and reduce mental noise.
          </p>
        </div>

        <!-- EMOTION -->
        <div class="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <h3 class="text-base font-semibold text-rose-300">Emotion</h3>
          <p class="mt-2 text-sm text-slate-300 leading-relaxed">
            Stress response, emotional regulation, gratitude, social connection.  
            The nervous system patterns that guide resilience.
          </p>
        </div>

        <!-- PRODUCTIVITY -->
        <div class="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <h3 class="text-base font-semibold text-amber-300">Productivity</h3>
          <p class="mt-2 text-sm text-slate-300 leading-relaxed">
            Deep work, meaningful goals, routines, and weekly structure.  
            Discipline without self-punishment. Progress, not pressure.
          </p>
        </div>
      </div>
    </section>

    <!-- WHAT HALO IS NOT -->
    <section class="space-y-3 rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <h2 class="text-lg font-semibold text-slate-100">What Halo is not</h2>
      <ul class="mt-2 space-y-2 text-sm text-slate-300 leading-relaxed">
        <li>• Not a calorie tracker.</li>
        <li>• Not a “grind culture” productivity app.</li>
        <li>• Not a place for guilt or perfectionism.</li>
        <li>• Not medical advice.</li>
        <li>• Not a dopamine-driven gamification system.</li>
      </ul>

      <p class="mt-3 text-sm text-slate-400">
        Halo is a calm space for awareness, reflection, and healthier patterns—not pressure.
      </p>
    </section>
  </main>
</template>
