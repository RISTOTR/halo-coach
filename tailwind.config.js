/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './app.{vue,js,ts}',
    './plugins/**/*.{js,ts}'
  ],
  theme: {
    extend: {
      colors: {
        halo: {
  bg: '#020617',
  card: '#020617', // si quieres muy oscuro
  accent: '#22c55e'
}
      }
    }
  },
  plugins: []
}
