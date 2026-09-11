/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html', './scripts/**/*.js'],
  theme: {
    extend: {
      colors: {
        navy: '#002B49',
        'navy-dark': '#001D33',
        red: '#C8102E',
        'red-dark': '#9B0A22',
        sky: '#2A7DE1',
        gold: '#F9C645',
        'off-white': '#F4F6F8',
        'gray-100': '#F1F5F9',
        'gray-200': '#E2E8F0',
        'gray-500': '#64748B',
        'gray-700': '#334155',
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
