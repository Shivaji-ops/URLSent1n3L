/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#EEF4F0',
        surface:  '#FFFFFF',
        border:   '#D1DDD7',
        primary:  '#1A3C2E',
        accent:   '#2D7A55',
        muted:    '#6B8070',
        benign:   '#1E6B45',
        threat:   '#B93232',
        amber:    '#C9922A',
        'bg-2':   '#E4EDE7',
      },
      fontFamily: {
        mono:  ['"IBM Plex Mono"', 'monospace'],
        sans:  ['"Inter"', 'sans-serif'],
      },
      keyframes: {
        'stamp-in': {
          '0%':   { opacity: '0', transform: 'scale(1.4)' },
          '60%':  { opacity: '1', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.3' },
        },
      },
      animation: {
        'stamp-in': 'stamp-in 380ms cubic-bezier(0.2, 1.4, 0.4, 1) both',
        'fade-up':  'fade-up 300ms ease both',
        'pulse-dot':'pulse-dot 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
