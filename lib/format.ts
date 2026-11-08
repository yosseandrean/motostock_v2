const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("id-ID", {
  style: "percent",
  maximumFractionDigits: 1,
});

/** Format a whole-rupiah amount as Indonesian IDR (e.g. 9000000 → "Rp 9.000.000"). */
export function formatIDR(amount: number): string {
  return idrFormatter.format(amount);
}

/** Format a fraction as an Indonesian percentage (e.g. 0.234 → "23,4%"). */
export function formatPercent(fraction: number): string {
  return percentFormatter.format(fraction);
}
