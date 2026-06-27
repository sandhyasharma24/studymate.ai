/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#0F172A", // Dark Slate background
          card: "#1E293B",
        },
        primary: {
          DEFAULT: "#8B5CF6", // Violet
          hover: "#7C3AED",
        },
        accent: {
          DEFAULT: "#06B6D4", // Cyan
          hover: "#0891B2",
        },
        text: {
          DEFAULT: "#F8FAFC",
          muted: "#CBD5E1",
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
    },
  },
  plugins: [],
}
