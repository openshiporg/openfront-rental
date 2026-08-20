export function formatMoney(amount?: number | null, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format((amount || 0) / 100);
}

export function formatMoneyExact(amount?: number | null, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((amount || 0) / 100);
}

export function formatType(value?: string | null) {
  const label = (value || 'stay').replaceAll('_', ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatStayDate(value?: string | null) {
  if (!value) return 'To be confirmed';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00.000Z`));
}
