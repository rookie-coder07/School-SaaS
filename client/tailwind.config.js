<<<<<<< HEAD
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/flowbite/**/*.js", // 👈 Flowbite scan path
  ],
=======
export default {
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
  theme: {
    extend: {
      colors: {
        brand: {
          900: "#1e2a4a", // deep academic blue
          800: "#24345c",
          700: "#2c3e6b",
        },
        accent: {
          emerald: "#1f9d8a",
          gold: "#d4af37",
        },
        surface: "#f8fafc",
        ink: "#0f172a",
      },
    },
  },
<<<<<<< HEAD
  plugins: [
    require("flowbite/plugin"), // 👈 Flowbite plugin
  ],
};
=======
  plugins: [],
};
>>>>>>> 86da91ecb79c10b4ea4564248eadddf5de227262
