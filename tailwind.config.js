/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  purge: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  /* This gets rid of the dark mode which is current system default as of this writing */
  daisyui: {
    themes: ["light"],
  },
};
