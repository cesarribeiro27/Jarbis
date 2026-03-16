/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
      },
      colors: {
        brand: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        jarbis: {
          brand:   '#6D28D9',
          accent:  '#7C3AED',
          surface: '#FAFAF8',
          dark:    '#0F0F1A',
          text:    '#1A1A2E',
          muted:   '#6B7280',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'brand-sm': '0 1px 2px 0 rgb(109 40 217 / 0.12)',
        'brand':    '0 4px 12px 0 rgb(109 40 217 / 0.20)',
        'brand-lg': '0 8px 24px 0 rgb(109 40 217 / 0.25)',
      },
    },
  },
  plugins: [],
}
