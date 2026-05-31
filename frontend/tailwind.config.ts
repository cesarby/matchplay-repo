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
        // Tipo "máquina de escribir" para etiquetas brutal (chips, meta, marquee).
        brutal: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        DEFAULT: 'var(--shadow)',
        hover: 'var(--shadow-hover)',
        warm: 'var(--shadow-warm)',
        // Sombras sólidas con offset — primitiva brutal.
        brutal: '6px 6px 0 0 rgb(var(--border))',
        'brutal-lg': '10px 10px 0 0 rgb(var(--border))',
        'brutal-sm': '4px 4px 0 0 rgb(var(--border))',
        'brutal-hover': '9px 9px 0 0 rgb(var(--border))',
        'brutal-press': '3px 3px 0 0 rgb(var(--border))',
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
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        diceRoll: {
          '0%, 15%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(90deg)' },
          '50%': { transform: 'rotate(180deg)' },
          '75%': { transform: 'rotate(270deg)' },
          '85%, 100%': { transform: 'rotate(360deg)' },
        },
        popIn: {
          from: { opacity: '0', transform: 'scale(0.6) rotate(-10deg)' },
          to: { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(4deg)' },
          '50%': { transform: 'translateY(-12px) rotate(2deg)' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out backwards',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
        marquee: 'marquee 22s linear infinite',
        'marquee-mobile': 'marquee 18s linear infinite',
        'dice-roll': 'diceRoll 3s ease-in-out infinite',
        'pop-in': 'popIn 0.65s cubic-bezier(.5,1.6,.4,1) both',
        wiggle: 'wiggle 0.5s ease-in-out',
        float: 'float 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
