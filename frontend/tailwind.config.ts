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
        background: 'rgb(var(--background) / <alpha-value>)',
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
    },
  },
  plugins: [],
}

export default config
