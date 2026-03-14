module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Roboto", "Inter", "sans-serif"]
      },
      colors: {
        brand: {
          blue: "#4285F4",
          blueDark: "#1A73E8",
          green: "#34A853",
          red: "#EA4335",
          yellow: "#FBBC05"
        }
      }
    }
  },
  plugins: []
};
