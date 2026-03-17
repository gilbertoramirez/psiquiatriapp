/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff5f5',
          100: '#ffe0e0',
          200: '#ffc2c2',
          300: '#ff9999',
          400: '#ff6b6b',
          500: '#e84545',
          600: '#d63031',
          700: '#c0392b',
          800: '#a93226',
          900: '#8b1a1a',
        },
        salmon: {
          50: '#fff8f6',
          100: '#ffede8',
          200: '#ffd5cc',
          300: '#ffb8a8',
          400: '#fa8072',
          500: '#f06856',
          600: '#e05544',
          700: '#c44536',
          800: '#a3382b',
          900: '#872d23',
        },
        accent: {
          50: '#fff5f5',
          100: '#ffe0e0',
          200: '#ffc2c2',
          300: '#ff9999',
          400: '#ff6b6b',
          500: '#e84545',
          600: '#d63031',
          700: '#c0392b',
          800: '#a93226',
          900: '#8b1a1a',
        },
      },
    },
  },
  plugins: [],
}
