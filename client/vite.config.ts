import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  // This must match your GitHub repository name exactly for assets to load
  base: "/Binary-Bees---Cafeteria-Management/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // This proxy only works during 'npm run dev'
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
