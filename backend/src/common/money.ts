/** All money is handled as integer paise. Never use floating point for currency math. */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatPaiseAsInr(paise: number): string {
  return `₹${paiseToRupees(paise).toLocaleString('en-IN')}`;
}
