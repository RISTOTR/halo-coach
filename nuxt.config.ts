// nuxt.config.ts
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase',
    '@nuxtjs/i18n'
  ],

  css: ['~/assets/css/tailwind.css'],

  typescript: {
    strict: true
  },

  app: {
    head: {
      title: 'Halo – Holistic Habit & AI Coach',
      meta: [
        {
          name: 'description',
          content:
            'Holistic habit tracking with AI coaching. Sleep, mood, stress, movement and goals in one place.'
        }
      ],
      htmlAttrs: {
        lang: 'en'
      }
    }
  },

  runtimeConfig: {
    openaiApiKey: process.env.NUXT_OPENAI_API_KEY,
    public: {
      appName: 'Halo',
      appLocaleDefault: 'en'
    }
  },

  supabase: {
    url: process.env.NUXT_PUBLIC_SUPABASE_URL,
    key: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
    redirectOptions: {
      login: '/auth',
      callback: '/auth/callback',
      // rutas que NO requieren login
      exclude: ['/', '/auth', '/auth/callback']
    }
  },


  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'en',
    lazy: true,
    langDir: 'locales',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'es', name: 'Español', file: 'es.json' }
    ]
  },

  tailwindcss: {
    viewer: false
  }
})
