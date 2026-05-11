module.exports = {
  content: ['./index.html', './script.js'],
  safelist: ['py-2', 'py-4'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        dark: '#050508',
        glass: 'rgba(255, 255, 255, 0.02)',
        border: 'rgba(255, 255, 255, 0.06)',
        accent: {
          400: '#00f2fe',
          500: '#4facfe',
          600: '#8b5cf6',
          700: '#ff0844',
        },
      },
      animation: {
        blob: 'blob 10s infinite alternate',
        marquee: 'marquee 25s linear infinite',
        'pulse-glow': 'pulse-glow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '100%': { transform: 'translate(40px, -50px) scale(1.2)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.8', filter: 'brightness(1)' },
          '50%': { opacity: '0.4', filter: 'brightness(1.2)' },
        },
      },
    },
  },
};
