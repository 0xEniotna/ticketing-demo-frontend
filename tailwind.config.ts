/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--primary) / <alpha-value>)',
        secondary: 'hsl(var(--secondary) / <alpha-value>)',
        accent: 'hsl(var(--accent) / <alpha-value>)',
        'base-100': 'hsl(var(--base-100) / <alpha-value>)',
        'base-200': 'hsl(var(--base-200) / <alpha-value>)',
        'base-300': 'hsl(var(--base-300) / <alpha-value>)',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark'],
  },
  safelist: [
    'animate-fade-in',
    'animate-fade-up',
    'animate-scale-in',
    'animate-fade-in-up',
    'animate-gradient-bg',
    'animate-pulse-slow',
  ],
};
