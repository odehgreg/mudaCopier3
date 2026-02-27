/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#EFF6FF', // light blue
          DEFAULT: '#3B82F6', // blue-500
          dark: '#1E40AF', // blue-800
        },
      },
    },
  },
  plugins: [],
};
