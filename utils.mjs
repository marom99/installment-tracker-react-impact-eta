export function parseNumber(v) {
  if (typeof v === "number") return v;
  if (!v) return 0;

  // Remove commas, then find the number
  const str = String(v).replace(/,/g, '');

  // Match the first number-like pattern. This handles misplaced hyphens
  // and multiple decimals by only matching the first valid occurrence.
  const match = str.match(/-?\d+(\.\d+)?/);

  if (!match) return 0;

  const n = Number(match[0]);

  return isNaN(n) ? 0 : n;
}
