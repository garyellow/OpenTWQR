import tailwindcssAnimate from 'tailwindcss-animate';
import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display',
          'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif',
        ],
        mono: ['SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    // standalone: variant — style elements only when running as installed PWA
    plugin(({ addVariant }) => {
      addVariant('standalone', '@media (display-mode: standalone)');
    }),
  ],
}
