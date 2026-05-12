import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.PORT || env.VITE_DEV_PORT || 3003);

  return {
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      port,
      strictPort: true,
    },
    preview: {
      host: "127.0.0.1",
      port,
      strictPort: true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            charts: ["recharts"],
            react: ["react", "react-dom", "react-router-dom"],
          },
        },
      },
    },
  };
});
