/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#183D32',
          dark: '#112C24',
          light: '#255546',
          muted: '#183D3215',
        },
        sand: {
          DEFAULT: '#E8DDC8',
          light: '#F2EBDE',
          dark: '#D5C4A6',
          border: '#D9CBAD',
        },
        ivory: {
          DEFAULT: '#F8F5ED',
          light: '#FCFAF7',
          surface: '#F3EFE4',
        },
        charcoal: {
          DEFAULT: '#292C27',
          light: '#42463F',
          muted: '#686D64',
          border: '#292C2720',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Lato"', '"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        editorial: ['"Cormorant Garamond"', 'serif'],
        malayalam: ['"Noto Sans Malayalam"', '"Gayathri"', 'sans-serif'],
      },
      letterSpacing: {
        editorial: '0.15em',
        widest: '0.25em',
      },
    },
  },
  plugins: [],
}
