/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: 'var(--color-obsidian)',
        sand: {
          DEFAULT: 'var(--color-sand)',
          light: 'var(--color-sand-light)'
        },
        papyrus: 'var(--color-papyrus)',
        bronze: 'var(--color-bronze)',
        'dark-brown': 'var(--color-dark-brown)',
      }
    },
  },
  plugins: [],
}
