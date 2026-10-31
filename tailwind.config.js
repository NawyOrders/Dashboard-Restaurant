/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
