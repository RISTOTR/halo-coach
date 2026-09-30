<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <div class="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900
             relative">
      <header class="border-b border-white/10 bg-black/40 backdrop-blur">
        <div class="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 lg:flex-nowrap">
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
        class="flex min-w-0 items-center gap-2 group"
      >
        <img
          src="/Halo_logo3.png"
          alt="Halo logo"
          class="h-8 w-8 shrink-0 my-2 mx-2 rounded-lg shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform"
        >
        <div class="text-sm font-semibold tracking-tight">
             
              <span class="ml-1 text-[11px] text-slate-400">Holistic Habit Coach</span>
            </div>
      </NuxtLink>
          <nav aria-label="Main navigation" class="order-last flex w-full min-w-0 items-center gap-4 overflow-x-auto whitespace-nowrap text-xs lg:order-none lg:w-auto lg:overflow-visible [&>a]:flex [&>a]:min-h-11 lg:[&>a]:min-h-0 [&>a]:shrink-0 [&>a]:items-center [&>a]:rounded [&>a]:focus-visible:outline [&>a]:focus-visible:outline-2 [&>a]:focus-visible:outline-emerald-300">
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
          <div class="flex shrink-0 items-center gap-3 text-xs">
            <button v-if="user" type="button"
              class="inline-flex min-h-11 sm:min-h-0 items-center rounded-full border border-white/20 px-3 py-1 text-[11px] text-slate-200 hover:bg-white/10"
              @click="handleLogout">
              Sign out
            </button>
            <NuxtLink v-else to="/auth"
              class="inline-flex min-h-11 sm:min-h-0 items-center rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-100 hover:bg-emerald-500/20">
              Sign in
            </NuxtLink>
          </div>
        </div>
      </header>

      <main class="mx-auto w-full min-w-0 max-w-5xl px-4 py-6 relative z-10 [overflow-wrap:anywhere]"> <div>
    <OnboardingModal
  v-if="!loading && isModalOpen"
  @close="handleModalClose"
/>

    <p v-if="onboardingError" role="status" class="mb-3 text-xs text-slate-300">{{ onboardingError }}</p>
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

const { showOnboarding, errorMessage: onboardingError, loadOnboardingStatus, completeOnboarding } = useOnboarding()
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
