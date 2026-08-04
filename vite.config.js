import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from a GitHub Pages *project* site at https://<user>.github.io/tt-drive/,
// so assets must resolve under that sub-path. If you deploy to a root domain
// (custom domain or a *.github.io user site), change base to "/".
export default defineConfig({
  base: "/tt-drive/",
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.{js,jsx}"],
  },
});
