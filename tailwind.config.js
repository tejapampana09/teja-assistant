/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        night: "#05070c",
        panel: "rgba(10, 17, 31, 0.72)",
        line: "rgba(148, 163, 184, 0.18)",
        neon: "#22d3ee",
        cobalt: "#2563eb",
        violet: "#8b5cf6"
      },
      boxShadow: {
        glow: "0 0 34px rgba(34, 211, 238, 0.28)",
        panel: "0 24px 80px rgba(0, 0, 0, 0.45)"
      },
      animation: {
        pulseGlow: "pulseGlow 3.2s ease-in-out infinite",
        float: "float 7s ease-in-out infinite"
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 22px rgba(34, 211, 238, 0.25)" },
          "50%": { boxShadow: "0 0 52px rgba(37, 99, 235, 0.55)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" }
        }
      }
    }
  },
  plugins: []
};
