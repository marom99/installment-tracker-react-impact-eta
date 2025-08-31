export function parseNumber(v) {
  if (typeof v === "number") return v;
  if (!v) return 0;
  const cleaned = String(v).replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}
