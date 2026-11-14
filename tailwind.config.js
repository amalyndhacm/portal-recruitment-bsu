/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Palet resmi "lima sayap" — diambil langsung dari lima warna logo
      // PT Bintang Sayap Utama. Varian "-dark" dipakai khusus untuk teks
      // supaya kontrasnya tetap memenuhi aksesibilitas di atas latar putih.
      colors: {
        brand: {
          teal: '#2FB4C4',
          'teal-dark': '#1B8A97',
          green: '#3AA65B',
          'green-dark': '#2C8047',
          gold: '#F0B429',
          'gold-dark': '#B8860B',
          red: '#E8543E',
          'red-dark': '#C23B27',
          blue: '#2E7FBF',
          'blue-dark': '#1F5C8F',
        },
      },
    },
  },
  plugins: [],
};