import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In `npm run dev`, /api is proxied to a locally running backend.
// In Docker/Kubernetes, Nginx or the Ingress does the same routing.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": process.env.VITE_API_PROXY || "http://localhost:8000" },
  },
});
