import { readFileSync } from "node:fs";
import type { Plugin } from "vite";

/** Expose slide positions for the app's reader without duplicating the deck. */
export function instructionsManifest(): Plugin {
  const manifest = new URL("../src/data/slides-manifest.json", import.meta.url);
  const contents = () => {
    const slides = JSON.parse(readFileSync(manifest, "utf8")) as { position: number }[];
    if (!Array.isArray(slides) || !slides.length ||
        slides.some(slide => !Number.isInteger(slide.position) || slide.position < 1)) {
      throw new Error("Invalid instructions slide manifest");
    }
    return JSON.stringify(slides.map(slide => slide.position).sort((a, b) => a - b));
  };
  return {
    name: "instructions-slide-manifest",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== `${server.config.base}instructions-slides.json`) {
          return next();
        }
        try {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(contents());
        } catch (error) {
          next(error);
        }
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "instructions-slides.json", source: contents() });
    },
  };
}
