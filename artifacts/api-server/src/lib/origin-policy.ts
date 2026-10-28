export function safeBrowserOrigin(
  origin: string | undefined,
  expectedHost: string | undefined,
  allowedHostnames: ReadonlySet<string>,
  production: boolean,
  crossSite: boolean,
): string | null {
  try {
    const url = new URL(origin ?? "");
    if (url.host !== expectedHost || crossSite || !allowedHostnames.has(url.hostname)) return null;
    if (production ? url.protocol !== "https:" : !["https:", "http:"].includes(url.protocol)) return null;
    return url.origin;
  } catch {
    return null;
  }
}
