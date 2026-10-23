import { defineConfig } from "cf/config";

// unfold.foo: the demo page and unfold.js, served as static files.
export default defineConfig({
  worker: {
    name: "unfold-duo",
    compatibilityDate: "2026-09-25",
    assets: { notFoundHandling: "404-page" },
    domains: ["unfold.foo", "www.unfold.foo"],
    observability: { enabled: true },
  },
});
