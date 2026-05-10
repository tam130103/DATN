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
          active: 'var(--app-active)',
          accent: 'var(--app-accent)',
          success: 'var(--app-success)',
          danger: 'var(--app-danger)',
          warning: 'var(--app-warning)',
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
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        app: 'var(--app-shadow)',
        'app-lg': 'var(--app-shadow-lg)',
        'app-floating': 'var(--app-shadow-floating)',
        'app-elevated': 'var(--app-shadow-elevated)',
      },
      borderRadius: {
        'app': '8px',
        'app-lg': '12px',
        'app-xl': '16px',
      }
    },
  },
  plugins: [],
}
