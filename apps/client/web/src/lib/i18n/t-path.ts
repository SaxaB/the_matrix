/**
 * Dot-path lookup for nested message objects (e.g. "nav.dashboard").
 */
export function messageAtPath(
  root: Record<string, unknown>,
  path: string
): string {
  const parts = path.split(".");
  let cur: unknown = root;
  for (const p of parts) {
    if (cur === null || typeof cur !== "object") {
      return path;
    }
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : path;
}
