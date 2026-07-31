/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Primary red — buttons, links, active states, CTAs. NOT used for body text.
        brand: {
          50: "#fdeced",
          100: "#fbd6d8",
          200: "#f5aeb2",
          300: "#ea7e84",
          400: "#e0454e",
          500: "#e01e26", // primary red
          600: "#c11119",
          700: "#9c0e15",
          800: "#7a0d12",
          900: "#4a0509",
        },
        // Neutral charcoal — body text, headings, sidebar/footer, dark chrome.
        ink: {
          50: "#f7f7f7",
          100: "#eeeeee",
          200: "#dcdcdc",
          300: "#bdbdbd",
          400: "#8f8f8f",
          500: "#666666",
          600: "#454545",
          700: "#2e2e2e",
          800: "#212121",
          900: "#1a1a1a",
        },
        // Neutral warm-gray — borders, subtle backgrounds, table headers, dividers.
        sandal: {
          50: "#fafafa",
          100: "#f2f2f2",
          200: "#e6e6e6",
          300: "#d4d4d4",
          400: "#b0b0b0",
          500: "#8c8c8c",
        },
        // Gold — used sparingly for highlights (offer banner spark, featured badges).
        gold: {
          400: "#e0b83d",
          500: "#d4a017",
          600: "#b3860f",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 10px rgba(26, 26, 26, 0.07)",
      },
      keyframes: {
        // Content visibly travels left -> right (starts shifted left, ends at rest).
        marquee: {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        marquee: "marquee 22s linear infinite",
      },
    },
  },
  plugins: [],
}
