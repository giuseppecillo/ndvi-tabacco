import { useLayoutEffect, useRef } from "react";
import { useDeckLanguage } from "../i18n";

const vw = (n: number) => (window.innerWidth * n) / 100;
const authoredLines = (box: HTMLElement) =>
  [...box.querySelectorAll<HTMLElement>(":scope > p")].map((p) => parseFloat(p.dataset.lh ?? "") || 0);
// Single-line UI labels (one authored line in a box about one line tall):
// they stay on one line and may use free space to their right
// (tiny menu labels up to 5.3vw, larger headings up to 2x the box width)
// before shrinking.
const isLabel = (box: HTMLElement) => {
  const lines = authoredLines(box);
  return lines.length === 1 && box.clientHeight < vw(lines[0]) * 1.3;
};
const overflowing = (box: HTMLElement) => {
  if (isLabel(box)) {
    const w = box.querySelector("p")?.scrollWidth ?? 0;
    const tiny = box.clientHeight < vw(1.2);
    return w > Math.max(box.clientWidth, tiny ? vw(5.3) : box.clientWidth * 2) + 1;
  }
  // PowerPoint boxes are often shorter than their text even in Italian; the
  // authored height is one line per paragraph. Only extra wrapped lines from
  // the translation count as overflow.
  const natural = authoredLines(box).reduce((sum, lh) => sum + vw(lh), 0);
  return box.scrollHeight > Math.max(box.clientHeight, natural) + 1 || box.scrollWidth > box.clientWidth + 1;
};

/**
 * EN/ES only: shrinks translated text inside the uploaded PowerPoint text
 * boxes until it fits the box's real width/height. Italian keeps the
 * uploaded layout untouched. Boxes are the absolutely positioned divs with
 * a fixed height that contain <p> runs.
 */
export function useFitText<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const lang = useDeckLanguage();
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const boxes = [...root.querySelectorAll<HTMLElement>("div")].filter(
      (d) => d.style.height && d.querySelector(":scope > p"),
    );
    const fit = () => {
      let remaining = 0;
      for (const box of boxes) {
        const runs = [...box.querySelectorAll<HTMLElement>("p, span")];
        for (const el of runs) {
          // restore authored values before (re)measuring
          if (el.dataset.fs === undefined) {
            el.dataset.fs = el.style.fontSize;
            el.dataset.lh = el.style.lineHeight;
          } else {
            el.style.fontSize = el.dataset.fs;
            el.style.lineHeight = el.dataset.lh ?? "";
          }
        }
        for (const p of box.querySelectorAll<HTMLElement>(":scope > p")) {
          p.style.whiteSpace = lang !== "it" && isLabel(box) ? "nowrap" : "";
          p.style.width = lang !== "it" && isLabel(box) ? "max-content" : "";
        }
        if (lang === "it" || !overflowing(box)) continue;
        // allow the box to be measured vertically
        for (let k = 0.94, i = 0; k > 0.7 && overflowing(box); k *= 0.94, i++) {
          for (const el of runs) {
            const fs = parseFloat(el.dataset.fs ?? "");
            const lh = parseFloat(el.dataset.lh ?? "");
            if (fs) el.style.fontSize = `calc(${fs}vw * ${k})`;
            if (lh) el.style.lineHeight = `calc(${lh}vw * ${k})`;
          }
        }
        if (overflowing(box)) { remaining++; box.dataset.overflow = "1"; } else delete box.dataset.overflow;
      }
      root.dataset.fitOverflow = String(remaining);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    void document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [lang]);
  return ref;
}
