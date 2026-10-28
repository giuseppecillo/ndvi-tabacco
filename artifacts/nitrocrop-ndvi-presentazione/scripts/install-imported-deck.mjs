import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";

// Compatibility normalization for importPptx's 960×540 staged components.
// Run from workspace root, passing the untouched import staging directory.
const staging = resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("Supply the PPTX import staging directory");
const artifact = fileURLToPath(new URL("../", import.meta.url));
const files = readdirSync(staging).filter(name => /^Slide\d+\.tsx$/.test(name))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
if (!files.length) throw new Error("No imported slides found");
const images = join(artifact, "src/assets/imported-presentation");
mkdirSync(images, { recursive: true });
for (const image of readdirSync(join(staging, "assets/images"))) {
  if (!image.endsWith(".png")) throw new Error(`Unexpected media type: ${image}`);
  execFileSync("convert", [
    join(staging, "assets/images", image), "-quality", "86",
    join(images, image.replace(/\.png$/, ".webp")),
  ], { stdio: "pipe" });
}

const value = (number, axis) => `${Number((Number(number) / axis * 100).toFixed(6))}${axis === 960 ? "vw" : "vh"}`;
const manifest = [];
const previous = JSON.parse(readFileSync(join(artifact, "src/data/slides-manifest.json"), "utf8"));
for (const [i, file] of files.entries()) {
  const source = readFileSync(join(staging, file), "utf8");
  const name = `ImportedSlide${i + 1}`;
  const imports = [...source.matchAll(/^import (img_\d+) from "\.\/assets\/images\/([^"]+)";/gm)]
    .map(([, variable, image]) => `import ${variable} from "../../assets/imported-presentation/${image.replace(/\.png$/, ".webp")}";`).join("\n");
  const contentStart = source.indexOf("><div key={0}");
  const contentEnd = source.lastIndexOf("</div></div>;");
  if (contentStart < 0 || contentEnd < 0) throw new Error(`Unsupported imported wrapper: ${file}`);
  let content = source.slice(contentStart + 1, contentEnd);
  // Text runs split by PowerPoint are one paragraph, not independent phrases.
  // Joining them preserves grammar when the full paragraph is translated.
  content = content.replace(/(<p style=\{\{[\s\S]*?\}\}>)([\s\S]*?)(<\/p>)/g, (match, opening, body, closing) => {
    const spans = [...body.matchAll(/<span style=\{\{([\s\S]*?)\}\}>\{("(?:[^"\\]|\\.)*")\}<\/span>/g)];
    if (!spans.length) return match;
    const text = spans.map(span => runInNewContext(span[2])).join("").replace(/\s+/g, " ").trim();
    const numbered = /^Pagina \d+$/.test(text) ? `Pagina ${i + 1}` : text;
    return `${opening}<span style={{${spans[0][1]}}}>{t(${JSON.stringify(numbered)})}</span>${closing}`;
  });
  content = content.replace(/fontSize: "calc\(([\d.]+)pt \* var\(--pptx-font-scale, 1\)\)"/g,
    (_, size) => `fontSize: "${value(Number(size) * 4 / 3, 960)}"`);
  content = content.replace(/\b(left|width|top|height): "(-?[\d.]+)px"/g,
    (_, key, size) => `${key}: "${value(size, ["top", "height"].includes(key) ? 540 : 960)}"`);
  content = content.replace(/\b(padding): "([^"]+)"/g, (_, key, sizes) =>
    `${key}: "${sizes.split(" ").map((size, index) => {
      const match = size.match(/^(-?[\d.]+)px$/);
      return match ? value(match[1], index % 2 === 0 ? 540 : 960) : size;
    }).join(" ")}"`);
  content = content.replace(/\b(marginTop|marginBottom): "([\d.]+)pt"/g,
    (_, key, size) => `${key}: "${value(Number(size) * 4 / 3, 540)}"`);
  content = content.replace(/(<p style=\{\{)([\s\S]*?)(\}\}><span style=\{\{)([\s\S]*?)(\}\}>\{t\(("(?:[^"\\]|\\.)*")\)\}<\/span><\/p>)/g,
    (_, p, pStyle, middle, spanStyle, closing, text) => {
      const fit = style => style.replace(/fontSize: "([\d.]+vw)"/g, (_match, size) => `fontSize: t.font("${size}", ${text})`);
      return `${p}${fit(pStyle)}${middle}${fit(spanStyle)}${closing}`;
    });
  if (i === 12) {
    // The source's concluding columns contain over-wide text boxes and manual
    // line breaks. Keep the two-column layout but let each sentence wrap safely.
    content = content.replace(/(<div key=\{(?:7|9|11|13|15|17)\} style=\{\{)([\s\S]*?)(\}\}>)([\s\S]*?)(<\/div>)/g,
      (_, opening, style, middle, body, closing) => {
        const text = [...body.matchAll(/\{t\(("(?:[^"\\]|\\.)*")\)\}/g)]
          .map(match => JSON.parse(match[1])).join(" ");
        const bounded = style.replace(/width: "[\d.]+vw"/, 'width: "42.5vw"');
        return `${opening}${bounded}${middle}<p style={{ margin: 0, fontFamily: "'Inter', sans-serif", color: "#1E3A5F", lineHeight: 1.45, fontSize: t.font("2vw", ${JSON.stringify(text)}) }}>{t(${JSON.stringify(text)})}</p>${closing}`;
      });
  }
  if (i === 10) {
    const warning = "Nota: i valori numerici della schermata originale non sono coerenti tra loro. Figura mantenuta dall’allegato; per i calcoli usare le formule e i dati aggiornati dell’app.";
    content += `<div role="note" style={{ position: "absolute", left: "4vw", top: "78vh", width: "92vw", padding: "1vh 1vw", boxSizing: "border-box", borderRadius: "4px", background: "#fff5dc", color: "#775313", lineHeight: 1.35, fontSize: t.font("1.35vw", ${JSON.stringify(warning)}) }}>{t(${JSON.stringify(warning)})}</div>`;
  }
  const imageIds = new Map([...source.matchAll(/^import (img_\d+) from "\.\/assets\/images\/image_(\d+)\.png";/gm)]
    .map(([, variable, id]) => [variable, Number(id)]));
  content = content.replace(/<img(\s+key=\{\d+\})? src=\{(img_\d+)\}/g, (match, key, variable) =>
    [3, 5, 6, 7, 8, 9].includes(imageIds.get(variable))
      ? `<LocalizedFigure${key ?? ""} imageId={${imageIds.get(variable)}} source={${variable}}`
      : match);
  // Small decorative borders remain fixed; all actual slide geometry is fluid.
  if (/layout\.|outerRef|transform: `scale/.test(content)) throw new Error(`Unnormalized layout: ${file}`);
  const usesFigures = content.includes("<LocalizedFigure");
  const output = `import type { FC } from "react";\nimport { useDeckText } from "../../i18n";\n${usesFigures ? 'import { LocalizedFigure } from "../../components/LocalizedFigure";\n' : ""}${imports}\n\nconst ${name}: FC = () => {\nconst t = useDeckText();\nreturn (\n<div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#ffffff" }}>\n${content}\n</div>\n);\n};\nexport default ${name};\n`;
  writeFileSync(join(artifact, "src/pages/slides", `${name}.tsx`), output);
  const texts = [...source.matchAll(/>\{"([^"]+)"\}</g)].map(match => match[1]);
  const title = i === 0 ? "Nitro Crop NDVI" :
    texts.filter(text => text.length > 15 && !text.includes("Taurus") && !text.includes("NitroCrop"))[0] ?? `Nitro Crop NDVI — ${i + 1}`;
  manifest.push({
    id: previous.find(slide => slide.filepath === `src/pages/slides/${name}.tsx`)?.id ?? randomUUID(), position: i + 1, filepath: `src/pages/slides/${name}.tsx`,
    title: title.slice(0, 120), description: `Diapositiva ${i + 1} della presentazione Nitro Crop NDVI fornita dal titolare.`,
    speakerNotes: "",
  });
}
// Replace, rather than append: the user asked to substitute the old deck.
writeFileSync(join(artifact, "src/data/slides-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Installed ${manifest.length} imported slides with optimized images.`);
