/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f9fafb',
          100: '#f3f4f6',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#111827',
          700: '#030712',
        },
      },
    },
  },
  plugins: [],
}
