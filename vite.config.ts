import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-tabs', '@radix-ui/react-tooltip', '@radix-ui/react-scroll-area', '@radix-ui/react-collapsible', '@radix-ui/react-select', '@radix-ui/react-slider', '@radix-ui/react-switch'],
          'vendor-ffmpeg': ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
          'vendor-motion': ['framer-motion'],
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
}));
