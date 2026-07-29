/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Paleta Estación Color ──
        primary: {
          DEFAULT: '#E55B2B',
          hover:   '#D04A1B',
          soft:    '#FFF3EE',
          50:      '#FFF3EE',
          100:     '#FFE1D0',
          200:     '#FFC2A0',
          300:     '#FFA070',
          400:     '#FF7A45',
          500:     '#E55B2B',
          600:     '#D04A1B',
          700:     '#B53C14',
          800:     '#8F2E0E',
          900:     '#6A2009',
        },
        secondary: {
          DEFAULT: '#1E293B',
          50:      '#F1F5F9',
          100:     '#E2E8F0',
          200:     '#CBD5E1',
          300:     '#94A3B8',
          400:     '#64748B',
          500:     '#475569',
          600:     '#334155',
          700:     '#1E293B',
          800:     '#0F172A',
          900:     '#020617',
        },
        // ── Fondo y superficies ──
        background: '#F8FAFC',
        surface:    '#FFFFFF',
        // ── Estados ──
        success: {
          DEFAULT: '#10B981',
          light:   '#D1FAE5',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light:   '#FEF3C7',
        },
        danger: {
          DEFAULT: '#EF4444',
          light:   '#FEE2E2',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card':    '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-md': '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
        'card-lg': '0 10px 15px -3px rgba(0,0,0,0.06), 0 4px 6px -4px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      animation: {
        'fade-in':     'fadeIn 0.2s ease-out',
        'slide-in':    'slideIn 0.25s ease-out',
        'pulse-soft':  'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
