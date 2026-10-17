import type { Config } from 'tailwindcss';

/** Trailhead theme tokens — swap these to re-skin the whole app. */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: '#F5F1E8',      // page background (cream)
        paper: '#FFFDF8',       // cards
        line: '#E3DCCB',        // borders
        line2: '#EFE9DB',       // subtle dividers
        sand: '#EDE6D5',        // map / bars background
        ink: '#1B1F1C',         // text
        ink2: '#4A4F4B',        // body text
        muted: '#6B716C',       // captions
        forest: { DEFAULT: '#1F4D3A', deep: '#163A2B', tint: '#E2EEE7', line: '#BFD6C8', soft: '#D7E5DC' },
        clay: { DEFAULT: '#C4552D', deep: '#9A3E1E', tint: '#F2DCD2' },
        gold: '#FFD166',
        danger: '#B3261E',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Manrope', 'Noto Sans Thai', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '20px', lg2: '14px', xl2: '24px', pill: '999px' },
      boxShadow: { card: '0 24px 60px rgba(27,31,28,.12)', float: '0 10px 30px rgba(0,0,0,.15)', pop: '0 10px 24px rgba(0,0,0,.12)' },
      maxWidth: { page: '1200px' },
    },
  },
  plugins: [],
};
export default config;
