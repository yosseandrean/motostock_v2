const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/** Format a whole-rupiah amount as Indonesian IDR (e.g. 9000000 → "Rp 9.000.000"). */
export function formatIDR(amount: number): string {
  return idrFormatter.format(amount);
}
