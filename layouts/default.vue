<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <div class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900
             relative">
      <header class="border-b border-white/10 bg-black/40 backdrop-blur">
        <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <!-- <div class="flex items-center gap-2">
            <div
              class="h-7 w-7 rounded-xl bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-xs font-bold">
              H
            </div>
            <div class="text-sm font-semibold tracking-tight">
              Halo
              <span class="ml-1 text-[11px] text-slate-400">Holistic Habit Coach</span>
            </div>
          </div> -->
          <NuxtLink
        to="/"
        class="flex items-center gap-2 group"
      >
        <img
          src="/public/Halo_logo3.png"
          alt="Halo logo"
          class="h-8 w-8 my-2 mx-2 rounded-lg shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform"
        >
        <div class="text-sm font-semibold tracking-tight">
             
              <span class="ml-1 text-[11px] text-slate-400">Holistic Habit Coach</span>
            </div>
      </NuxtLink>
          <nav class="flex items-center gap-4 text-xs">
            <NuxtLink to="/" class="hover:text-emerald-300" active-class="text-emerald-300">
              {{ $t('nav.dashboard') }}
            </NuxtLink>
            <NuxtLink to="/check-in" class="hover:text-emerald-300" active-class="text-emerald-300">
              {{ $t('nav.checkin') }}
            </NuxtLink>
            <NuxtLink to="/habits" class="hover:text-emerald-300" active-class="text-emerald-300">
              {{ $t('nav.habits') }}
            </NuxtLink>
            <NuxtLink to="/experiments" class="hover:text-emerald-300" active-class="text-emerald-300">
              {{ $t('nav.experiments') }}
            </NuxtLink>
            <NuxtLink to="/reports" class="hover:text-emerald-300" active-class="text-emerald-300">
              {{ $t('nav.reports') }}
            </NuxtLink>
            <NuxtLink to="/science" class="hover:text-emerald-300" active-class="text-emerald-300">
              {{ $t('nav.science') }}
            </NuxtLink>
            <NuxtLink to="/settings" class="hover:text-emerald-300" active-class="text-emerald-300">
              {{ $t('nav.settings') }}
            </NuxtLink>
          </nav>
          <div class="flex items-center gap-3 text-xs">
            <button v-if="user" type="button"
              class="rounded-full border border-white/20 px-3 py-1 text-[11px] text-slate-200 hover:bg-white/10"
              @click="handleLogout">
              Sign out
            </button>
            <NuxtLink v-else to="/auth"
              class="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-100 hover:bg-emerald-500/20">
              Sign in
            </NuxtLink>
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-5xl px-4 py-6 relative z-10"> <div>
    <OnboardingModal
  v-if="!loading && isModalOpen"
  @close="handleModalClose"
/>

    <slot />
  </div>
      </main>
    </div>
  </div>
 
</template>
<script setup lang="ts">
import OnboardingModal from '~/components/OnboardingModal.vue'
import { useOnboarding } from '~/composables/useOnboarding'
import { useOnboardingModal } from '~/composables/useOnboardingModal'

const { showOnboarding, loadOnboardingStatus, completeOnboarding } = useOnboarding()
const { isOpen: manualOpen, close: closeManual } = useOnboardingModal()

const user = useSupabaseUser()
const supabase = useSupabaseClient()

const loading = ref(true)

const isModalOpen = computed(() => showOnboarding.value || manualOpen.value)

const handleModalClose = async () => {
  // If it's the first-time onboarding flow, persist completion
  if (showOnboarding.value) {
    await completeOnboarding()
  }
  // Always close the manual modal
  closeManual()
}

const handleLogout = async () => {
  await supabase.auth.signOut()
  navigateTo('/auth')
}

onMounted(async () => {
  loading.value = true
  await loadOnboardingStatus()
  loading.value = false
})
</script>

