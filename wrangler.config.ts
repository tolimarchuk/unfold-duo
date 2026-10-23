import { defineWranglerConfig } from "wrangler/experimental-config";

// `npm run deploy` copies the page, unfold.js and what they load into dist/; nothing else in the repo goes up.
export default defineWranglerConfig({
  assetsDirectory: "dist",
});
