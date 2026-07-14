/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        corporate: {
          50: '#f4f6f8',
          100: '#e5eaf0',
          200: '#c8d3e0',
          300: '#a1b8cf',
          400: '#7597ba',
          500: '#567a9e',
          600: '#425f7e',
          700: '#354d66',
          800: '#2d4156',
          900: '#1f2d3d', // Corporate dark navy
          950: '#131c26',
        },
        accent: {
          DEFAULT: '#3b82f6', // blue-500
          hover: '#2563eb',   // blue-600
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
