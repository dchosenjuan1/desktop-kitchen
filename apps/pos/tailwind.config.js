/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--brand-50, #f0fdfa)',
          100: 'var(--brand-100, #ccfbf1)',
          200: 'var(--brand-200, #99f6e4)',
          300: 'var(--brand-300, #5eead4)',
          400: 'var(--brand-400, #2dd4bf)',
          500: 'var(--brand-500, #14b8a6)',
          600: 'var(--brand-600, #0d9488)',
          700: 'var(--brand-700, #0f766e)',
          800: 'var(--brand-800, #115e59)',
          900: 'var(--brand-900, #134e4a)',
        },
      },
    },
  },
  plugins: [],
}
