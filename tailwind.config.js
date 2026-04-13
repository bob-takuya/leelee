/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b0f17',
        panel: '#121826',
        panel2: '#1a2233',
        line: '#2a3447',
        accent: '#6ee7ff',
        strut: '#ef4444',
        cable: '#3b82f6',
        candidate: '#64748b',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};
