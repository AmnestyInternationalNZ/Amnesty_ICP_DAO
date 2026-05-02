const path = require('node:path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'src/**/*.{js,ts,jsx,tsx}'),
  ],
  theme: {
    extend: {
      colors: {
        'amnesty-yellow': '#FFEC00',
        'amnesty-black': '#000000',
        'amnesty-white': '#FFFFFF',
        'amnesty-blue': '#1AA3D6',
        'amnesty-pink': '#EE4790',
        'amnesty-green': '#88C540',
        'amnesty-purple': '#511E84',
        'amnesty-orange': '#E87722',
        'amnesty-gray': {
          50: '#F7F7F2',
          100: '#F5F5F5',
          200: '#E7E5DE',
          300: '#D1CEC4',
          400: '#A8A499',
          500: '#737067',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
      },
      fontFamily: {
        'amnesty-sans': ['"Amnesty Trade Gothic"', 'Arial', 'sans-serif'],
        'amnesty-condensed': ['"Amnesty Trade Gothic Condensed"', '"Arial Narrow"', 'Arial', 'sans-serif'],
        'amnesty-serif': ['Archer', 'Georgia', 'serif'],
        'sans': ['"Amnesty Trade Gothic"', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'amnesty': '10px 10px 0px 0px #FFEC00',
        'amnesty-yellow': '14px 14px 0px 0px #FFEC00',
        'amnesty-dark': '10px 10px 0px 0px #000000',
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
