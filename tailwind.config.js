/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        void:    '#080810',
        surface: '#0f0f1a',
        panel:   '#14141f',
        border:  '#1e1e2e',
        muted:   '#3a3a5c',
        glow: {
          DEFAULT: '#7c3aed',
          dim:     '#4c1d95',
          soft:    '#a78bfa',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow:      '0 0 24px rgba(124, 58, 237, 0.45)',
        'glow-sm': '0 0 12px rgba(124, 58, 237, 0.30)',
        'glow-lg': '0 0 48px rgba(124, 58, 237, 0.60)',
      },
    },
  },
  plugins: [],
}
