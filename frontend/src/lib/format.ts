export function currency(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}
