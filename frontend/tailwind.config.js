/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          primary: 'var(--app-primary)',
          'primary-strong': 'var(--app-primary-strong)',
          'primary-soft': 'var(--app-primary-soft)',
          accent: 'var(--app-accent)',
          bg: 'var(--app-bg)',
          'bg-soft': 'var(--app-bg-soft)',
          surface: 'var(--app-surface)',
          'surface-muted': 'var(--app-surface-muted)',
          border: 'var(--app-border)',
          'border-strong': 'var(--app-border-strong)',
          text: 'var(--app-text)',
          muted: 'var(--app-muted)',
          'muted-strong': 'var(--app-muted-strong)',
        }
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        app: 'var(--app-shadow)',
        'app-lg': 'var(--app-shadow-lg)',
      }
    },
  },
  plugins: [],
}

