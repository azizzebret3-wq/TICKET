/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  corePlugins: {
    // Disable color space utilities that use oklab() which html2canvas doesn't support
    colorSpace: false,
  },
  theme: {
    extend: {
      // Use traditional colors instead of color functions
      colors: {
        // Keep the custom UVBF colors
      },
    },
  },
  plugins: [],
};
