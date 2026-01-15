<template>
  <main class="flex min-h-[70vh] items-center justify-center px-4">
    <div class="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/90 p-6 text-xs">
      <p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
        Halo
      </p>
      <h1 class="mt-1 text-lg font-semibold">
        Finishing sign-in…
      </h1>

      <p class="mt-2 text-slate-300">
        We’re validating your session. You’ll be redirected in a moment.
      </p>

      <div class="mt-4 text-slate-400 min-h-[2rem]">
        <p v-if="errorMessage" class="text-red-300">
          {{ errorMessage }}
        </p>
        <p v-else-if="checking">
          Checking your session…
        </p>
        <p v-else>
          Redirecting…
        </p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const checking = ref(true)
const errorMessage = ref('')

onMounted(async () => {
  try {
    // Forzamos a Supabase a leer el token de la URL y construir la sesión
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      console.error(error)
      errorMessage.value = 'Could not complete sign-in. Please try the link again.'
      checking.value = false
      return
    }

    // Si todo bien, navega al dashboard
    checking.value = false
    navigateTo('/')
  } catch (e) {
    console.error(e)
    errorMessage.value = 'Something went wrong completing sign-in.'
    checking.value = false
  }
})

// Si el módulo ya ha recuperado el user antes de getUser, también redirigimos
watch(
  user,
  (u) => {
    if (u && !checking.value) {
      navigateTo('/')
    }
  }
)
</script>
