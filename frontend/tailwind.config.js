/** @type {import('tailwindcss').Config} */
export default {
  // Define the files Tailwind should scan for class names to generate CSS
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {}, // Place custom theme overrides (colors, fonts, etc.) here
  },
  plugins: [], // Add Tailwind plugins (like forms, typography) here
}