import { GIS_ERRORS, GIS_LIMITS } from "./gisLimits";

/** Separate thread + hard deadline: malformed parsers cannot freeze the UI. */
export function decodeGis<T>(kind: "kml" | "kmz" | "zip" | "points", data: string | ArrayBuffer, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error("Import cancelled")); return; }
    const worker = new Worker(new URL("./gisImportWorker.ts", import.meta.url), { type: "module" });
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      worker.terminate();
    };
    const abort = () => { finish(); reject(new Error("Import cancelled")); };
    const timer = setTimeout(() => {
      finish();
      reject(new Error(GIS_ERRORS.timeout));
    }, GIS_LIMITS.timeoutMs);
    worker.onmessage = event => {
      finish();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.value);
    };
    worker.onerror = () => { finish(); reject(new Error(GIS_ERRORS.invalid)); };
    signal?.addEventListener("abort", abort, { once: true });
    worker.postMessage({ kind, data }, typeof data === "string" ? [] : [data]);
  });
}
