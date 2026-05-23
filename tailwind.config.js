/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html', './scripts/**/*.js'],
  theme: {
    extend: {
      colors: {
        navy: '#003087',
        'navy-dark': '#001f5b',
        red: '#CC3433',
        'red-dark': '#a82726',
        sky: '#ACC9E7',
        gold: '#F9C645',
        'off-white': '#f4f6fb',
        'gray-100': '#eef1f7',
        'gray-200': '#d5daea',
        'gray-500': '#7a84a0',
        'gray-700': '#3a4260',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 1px 4px rgba(0,0,0,.08)',
        DEFAULT: '0 4px 18px rgba(0,0,0,.1)',
        lg: '0 8px 32px rgba(0,0,0,.14)',
      },
    },
  },
};
