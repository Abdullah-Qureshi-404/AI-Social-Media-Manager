/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cafe: {
          50: '#faf6f0',
          100: '#f4ebd9',
          200: '#e7d4b2',
          300: '#d7b785',
          400: '#c79758',
          500: '#b87c38',
          600: '#a1632d',
          700: '#824b26',
          800: '#6d3e24',
          900: '#5a3420',
          950: '#321a10',
        },
      },
    },
  },
  plugins: [],
}
