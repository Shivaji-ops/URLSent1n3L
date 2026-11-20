/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Manrope', 'system-ui', 'sans-serif']
      },
      colors: {
        void: '#050505',
        threat: '#ff5c74',
        'threat-lift': '#ff8fa2'
      },
      keyframes: {
        'gw-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.18' }
        },
        'gw-drift': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'gw-blink': 'gw-blink 1.9s ease-in-out infinite',
        'gw-drift': 'gw-drift 900ms ease-out both'
      }
    }
  },
  plugins: []
};
