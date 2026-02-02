import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // This MUST match your repo name with slashes on both sides
  base: "/Binary-Bees---Cafeteria-Management/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
