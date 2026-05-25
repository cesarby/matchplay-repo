import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        background: {
          DEFAULT: 'rgb(var(--background) / <alpha-value>)',
          /** Un escalón más oscuro que background (light) / claro (dark).
              Para hero sections y bandas que necesitan contraste sutil. */
          alt: 'rgb(var(--background-alt) / <alpha-value>)',
        },
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        // 4 colores tablero — convención semántica fija
        red: {
          DEFAULT: 'rgb(var(--p-red) / <alpha-value>)',
          soft: 'rgb(var(--p-red-soft) / <alpha-value>)',
        },
        blue: {
          DEFAULT: 'rgb(var(--p-blue) / <alpha-value>)',
          soft: 'rgb(var(--p-blue-soft) / <alpha-value>)',
        },
        green: {
          DEFAULT: 'rgb(var(--p-green) / <alpha-value>)',
          soft: 'rgb(var(--p-green-soft) / <alpha-value>)',
        },
        yellow: {
          DEFAULT: 'rgb(var(--p-yellow) / <alpha-value>)',
          soft: 'rgb(var(--p-yellow-soft) / <alpha-value>)',
        },
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'var(--radius-sm)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        DEFAULT: 'var(--shadow)',
        hover: 'var(--shadow-hover)',
        warm: 'var(--shadow-warm)',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { boxShadow: '0 8px 24px rgba(200, 54, 44, 0.25)' },
          '50%': { boxShadow: '0 8px 32px rgba(200, 54, 44, 0.45)' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out backwards',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
