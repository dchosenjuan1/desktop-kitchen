/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--brand-50, #fef2f2)',
          100: 'var(--brand-100, #fee2e2)',
          200: 'var(--brand-200, #fecaca)',
          300: 'var(--brand-300, #fca5a5)',
          400: 'var(--brand-400, #f87171)',
          500: 'var(--brand-500, #ef4444)',
          600: 'var(--brand-600, #dc2626)',
          700: 'var(--brand-700, #b91c1c)',
          800: 'var(--brand-800, #991b1b)',
          900: 'var(--brand-900, #7f1d1d)',
        },
      },
    },
  },
  plugins: [],
}
