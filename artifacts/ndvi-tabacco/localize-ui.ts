import ts from "typescript";
import type { Plugin } from "vite";
import path from "node:path";

/**
 * Compile display-only JSX copy to catalogue lookups. This covers the legacy
 * agronomic UI without touching data IDs, input/select values or calculations.
 * No DOM mutation, network translation, or translation of submitted data.
 */
export function localizeUi(): Plugin {
  return {
    name: "nitrocrop-localize-ui",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith(".tsx") || !id.includes("/ndvi-tabacco/src/") ||
        id.includes("/i18n/") || id.includes("/components/ui/")) return;
      const file = ts.createSourceFile(id, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const edits: { start: number; end: number; value: string }[] = [];
      const displayAttributes = new Set(["title", "placeholder", "aria-label", "alt", "label", "body", "name"]);
      const userFields = new Set(["cliente", "appezzamento", "name", "email", "message", "response", "id"]);
      const wrap = (node: ts.Node, fn = "__ncDisplay") => {
        edits.push({ start: node.getStart(file), end: node.getStart(file), value: `${fn}(` });
        edits.push({ start: node.end, end: node.end, value: ")" });
      };
      const visit = (node: ts.Node) => {
        if (ts.isJsxText(node)) {
          // Match React's JSX whitespace semantics, including inline spacing.
          const lines = node.text.replace(/\r/g, "").split("\n");
          const last = lines.findLastIndex(line => /\S/.test(line));
          let text = "";
          lines.forEach((line, i) => {
            let part = line.replace(/\t/g, " ");
            if (i !== 0) part = part.replace(/^ +/, "");
            if (i !== lines.length - 1) part = part.replace(/ +$/, "");
            if (part) text += part + (i !== last ? " " : "");
          });
          if (text.trim()) edits.push({ start: node.pos, end: node.end, value: `{__ncDisplay(${JSON.stringify(text)})}` });
          return;
        }
        if (ts.isJsxAttribute(node) && displayAttributes.has(node.name.getText(file))) {
          // Input names are identifiers; only component name props are copy.
          const tag = node.parent.parent.tagName.getText(file);
          if (node.name.getText(file) === "name" && /^[a-z]/.test(tag)) return;
          if (node.initializer && ts.isStringLiteral(node.initializer)) {
            edits.push({ start: node.initializer.getStart(file), end: node.initializer.end, value: `{__ncLabel(${JSON.stringify(node.initializer.text)})}` });
          } else if (node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
            wrap(node.initializer.expression, "__ncLabel");
            ts.forEachChild(node.initializer.expression, visit);
          }
          return;
        }
        if (ts.isJsxExpression(node) && !ts.isJsxAttribute(node.parent) && node.expression) {
          // Preserve names and other free-form user content verbatim.
          const expr = node.expression;
          if (!(ts.isPropertyAccessExpression(expr) && userFields.has(expr.name.text))) wrap(expr);
        }
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
          ["alert", "confirm"].includes(node.expression.text) && node.arguments[0]) wrap(node.arguments[0]);
        ts.forEachChild(node, visit);
      };
      visit(file);
      if (!edits.length) return;
      // Reverse order preserves positions; stable sort handles nested insertions.
      edits.sort((a, b) => b.start - a.start || b.end - a.end);
      let result = code;
      for (const edit of edits) result = result.slice(0, edit.start) + edit.value + result.slice(edit.end);
      const runtime = path.resolve(import.meta.dirname, "src/i18n/runtime.ts").replace(/\\/g, "/");
      return { code: `import { translateDisplay as __ncDisplay, translateLabel as __ncLabel } from ${JSON.stringify(runtime)};\n${result}`, map: null };
    },
  };
}
