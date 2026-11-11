/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#302B28',
          700: '#4A413B',
          500: '#756B62',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#FDF8F1',
          sunken: '#F6EEE4',
        },
        line: '#E9E1D7',
        cream: {
          50: '#FDF8F1',
          100: '#FAF1E4',
          200: '#F5E7D3',
          300: '#EDD9BC',
        },
        brand: {
          50: '#FDECEA',
          100: '#FAD5D0',
          400: '#E85D4A',
          500: '#D93B2B',
          600: '#C2281A',
          700: '#A01F13',
        },
        gold: {
          300: '#E5C878',
          400: '#D9B45A',
          500: '#C9A227',
          600: '#A8871C',
        },
        mint: {
          100: '#DDF3E8',
          600: '#1E9E6A',
        },
      },
      fontFamily: {
        sans: ['"Cairo"', '"Tajawal"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(160, 31, 19, 0.06)',
        soft: '0 8px 30px rgba(160, 31, 19, 0.10)',
        lift: '0 18px 40px -24px rgba(160, 31, 19, 0.28)',
        hero: '0 24px 60px -40px rgba(160, 31, 19, 0.55)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
