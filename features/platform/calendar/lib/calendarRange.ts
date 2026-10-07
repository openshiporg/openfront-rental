const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string) {
  if (!DATE_ONLY.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateCalendarBlockRange(startDate: string, endDate: string) {
  if (!validDate(startDate) || !validDate(endDate) || startDate >= endDate) {
    return 'Choose a listing and a valid date range.';
  }
  return null;
}

export function calendarErrorPath(message: string) {
  return `/dashboard/platform/calendar?error=${encodeURIComponent(message)}`;
}
