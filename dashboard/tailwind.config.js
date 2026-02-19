/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          orange: '#E8995C',
          tan: '#D4915F',
          silver: '#B8B8B8',
          charcoal: '#4A4A4A',
          cream: '#E8E4DD',
        },
        dark: {
          primary: '#0a0a0a',
          secondary: '#1a1a1a',
          tertiary: '#2a2a2a',
          hover: '#333333',
        },
      },
      borderRadius: {
        '2xl': '1.5rem',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(232, 153, 92, 0.3)',
        'glow-lg': '0 0 40px rgba(232, 153, 92, 0.5)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(232, 153, 92, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(232, 153, 92, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}
