/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'amnesty-yellow': '#FFF200',
        'amnesty-black': '#000000',
        'amnesty-white': '#FFFFFF',
        'amnesty-gray': {
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
      },
      fontFamily: {
        'oswald': ['Oswald', 'Arial Black', 'Arial', 'sans-serif'],
        'sans': ['Arial', 'sans-serif'],
      },
      boxShadow: {
        'amnesty': '4px 4px 0px 0px #000000',
        'amnesty-yellow': '4px 4px 0px 0px #FFF200',
      },
      borderRadius: {
        'none': '0',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
}
