/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#7F77DD',
        danger: '#E24B4A',
        warning: '#EF9F27',
        success: '#639922',
      },
    },
  },
  plugins: [],
};

