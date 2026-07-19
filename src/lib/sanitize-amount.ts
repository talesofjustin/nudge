// Keeps a text input numeric without a native number input's spinner
// arrows: digits, a single leading minus, a single decimal point.
export function sanitizeAmountInput(raw: string): string {
  const negative = raw.trim().startsWith("-");
  let value = raw.replace(/[^0-9.]/g, "");
  const firstDot = value.indexOf(".");
  if (firstDot !== -1) {
    value = value.slice(0, firstDot + 1) + value.slice(firstDot + 1).replace(/\./g, "");
  }
  return (negative ? "-" : "") + value;
}
