/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light"],
      // by default seems to prefer system appearance (does it have dark mode enabled)
      // having one item sets it as the theme; more theme presets at https://daisyui.com/docs/themes/
  },
};
