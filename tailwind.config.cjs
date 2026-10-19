module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        sans: ['"Figtree"', 'sans-serif'],
      },
      colors: {
        page: '#F2F5EF',
        panel: '#F8FAF6',
        paddy: {
          DEFAULT: '#1F4D3A',
          hover: '#0F2F23',
          mid: '#2F6B55',
        },
        saffron: {
          DEFAULT: '#F2A33A',
          selected: '#FFF3DC',
          border: '#E39A2D',
        },
        ink: '#17302A',
        muted: '#4F6358',
        line: {
          DEFAULT: '#DCE4DA',
          strong: '#C9D3C8',
        },
        water: '#D6E6E2',
        land: '#E7EDD4',
        community: {
          bg: '#F3E4F0',
          text: '#6B2D62',
        },
      },
      borderRadius: {
        control: '12px',
        panel: '16px',
        card: '18px',
        modal: '20px',
      },
      boxShadow: {
        card: '0 6px 24px rgba(23,48,42,.14)',
      },
    },
  },
  plugins: [],
}
