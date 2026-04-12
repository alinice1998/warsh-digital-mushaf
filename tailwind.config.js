/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        quran: {
          paper: '#fffcf5',
          highlight: '#f5e6a3',
          border: '#e2d2b4',
        }
      },
      fontFamily: {
        arabic: ['Amiri', 'serif'],
      }
    },
  },
  plugins: [],
}
