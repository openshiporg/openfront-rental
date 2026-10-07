const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parseReportDate(value: string) {
  if (!DATE_ONLY.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.getTime()
    : null;
}

export function validateReportRange(startDate: string, endDate: string) {
  const start = parseReportDate(startDate);
  const end = parseReportDate(endDate);
  if (start == null || end == null) return 'Choose valid report dates in YYYY-MM-DD format.';
  if (end < start) return 'Report end date must be on or after the start date.';
  return null;
}
