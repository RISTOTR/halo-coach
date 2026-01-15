<template>
  <main class="flex min-h-[70vh] items-center justify-center px-4">
    <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/90 p-6">
      <p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
        Halo
      </p>
      <h1 class="mt-1 text-lg font-semibold">
        Sign in
      </h1>
      <p class="mt-1 text-xs text-slate-300">
        Use your email to receive a magic link and access your holistic habits and AI coaching.
      </p>

      <form class="mt-4 space-y-3 text-xs" @submit.prevent="handleLogin">
        <div>
          <label class="mb-1 block text-slate-200">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400/70"
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          class="mt-2 w-full rounded-full border border-emerald-500/60 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-60"
          :disabled="loading || !email"
        >
          <span v-if="loading">Sending magic link…</span>
          <span v-else>Send magic link</span>
        </button>
      </form>

      <div class="mt-3 text-[11px] text-slate-400 min-h-[2rem]">
        <p v-if="message" class="text-emerald-300">
          {{ message }}
        </p>
        <p v-else-if="errorMessage" class="text-red-300">
          {{ errorMessage }}
        </p>
        <p v-else>
          You’ll receive a one-time sign-in link. No password needed.
        </p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const email = ref('')
const loading = ref(false)
const message = ref('')
const errorMessage = ref('')

// Si ya está logueado, no tiene sentido estar en /auth
watch(
  user,
  (u) => {
    if (u) {
      navigateTo('/')
    }
  },
  { immediate: true }
)

const handleLogin = async () => {
  errorMessage.value = ''
  message.value = ''
  loading.value = true

  try {
    if (!import.meta.client) return

    const redirectTo = `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOtp({
      email: email.value,
      options: {
        emailRedirectTo: redirectTo
      }
    })

    if (error) {
      console.error(error)
      errorMessage.value = 'Failed to send magic link. Please try again.'
      return
    }

    message.value = 'Magic link sent. Check your inbox.'
  } catch (e) {
    console.error(e)
    errorMessage.value = 'Something went wrong.'
  } finally {
    loading.value = false
  }
}
</script>
