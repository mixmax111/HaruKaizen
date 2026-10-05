/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#4edea3",
        "primary-container": "#10b981",
        secondary: "#c0c1ff",
        "secondary-container": "#3131c0",
        tertiary: "#ffb2b7",
        background: "#0d0e15",
        surface: "#12131a",
        card: "#1a1b22",
        "card-container": "#1e1f26",
        cardBorder: "#27272a",
        outline: "#86948a",
        "outline-variant": "#3c4a42",
      },
      fontFamily: {
        mono: ["monospace"],
      },
    },
  },
  plugins: [],
};

