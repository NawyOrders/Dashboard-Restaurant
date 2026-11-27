/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 900: 'rgb(var(--c-ink-900) / <alpha-value>)', 700: 'rgb(var(--c-ink-700) / <alpha-value>)', 500: 'rgb(var(--c-ink-500) / <alpha-value>)' },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: 'rgb(var(--c-surface-muted) / <alpha-value>)',
          sunken: 'rgb(var(--c-surface-sunken) / <alpha-value>)',
        },
        line: { DEFAULT: 'rgb(var(--c-line) / <alpha-value>)', strong: 'rgb(var(--c-line-strong) / <alpha-value>)' },
        cream: { 50: 'rgb(var(--c-cream-50) / <alpha-value>)', 100: 'rgb(var(--c-cream-100) / <alpha-value>)', 200: 'rgb(var(--c-cream-200) / <alpha-value>)', 300: 'rgb(var(--c-cream-300) / <alpha-value>)' },
        brand: {
          50: 'rgb(var(--c-brand-50) / <alpha-value>)', 100: 'rgb(var(--c-brand-100) / <alpha-value>)', 200: 'rgb(var(--c-brand-200) / <alpha-value>)', 300: 'rgb(var(--c-brand-300) / <alpha-value>)',
          400: 'rgb(var(--c-brand-400) / <alpha-value>)', 500: 'rgb(var(--c-brand-500) / <alpha-value>)', 600: 'rgb(var(--c-brand-600) / <alpha-value>)', 700: 'rgb(var(--c-brand-700) / <alpha-value>)',
        },
        gold: {
          50: 'rgb(var(--c-gold-50) / <alpha-value>)', 200: 'rgb(var(--c-gold-200) / <alpha-value>)', 300: 'rgb(var(--c-gold-300) / <alpha-value>)', 400: 'rgb(var(--c-gold-400) / <alpha-value>)',
          500: 'rgb(var(--c-gold-500) / <alpha-value>)', 600: 'rgb(var(--c-gold-600) / <alpha-value>)', 800: 'rgb(var(--c-gold-800) / <alpha-value>)',
        },
        'on-gold': 'rgb(var(--c-on-gold) / <alpha-value>)',
        mint: {
          100: '#DDF3E8',
          600: '#1E9E6A',
        },
      },
      fontFamily: {
        sans: ['Alexandria', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgb(var(--c-shadow) / 0.06)',
        soft: '0 8px 30px rgb(var(--c-shadow) / 0.10)',
        lift: '0 18px 40px -24px rgb(var(--c-shadow) / 0.28)',
        hero: '0 24px 60px -40px rgb(var(--c-shadow) / 0.55)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
