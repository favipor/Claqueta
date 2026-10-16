import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        // Sombra al pasar el cursor: negra en tema claro, blanca (resplandor) en tema oscuro
        hover: "var(--shadow-hover)",
      },
      colors: {
        brand: {
          // Fondos con texto blanco: teal oscuro (contraste AA)
          DEFAULT: "#0f766e",
          dark: "#115e59",
          // Texto, bordes y contornos: cambia según tema (ver globals.css)
          fg: "rgb(var(--brand-fg) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
