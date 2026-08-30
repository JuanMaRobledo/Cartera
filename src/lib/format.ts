export function formatMoney(amount: number, currency?: string): string {
  const value = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return currency ? `${currency} ${value}` : value;
}

export function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(2)}%`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-AR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function signClass(value: number): string {
  if (value > 0) return "gain-text";
  if (value < 0) return "loss-text";
  return "";
}
