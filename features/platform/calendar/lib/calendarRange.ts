const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const CALENDAR_PATH = '/dashboard/platform/calendar';

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

export function isCalendarMonth(value?: string | null): value is string {
  const match = MONTH.exec(value || '');
  return Boolean(match && Number(match[1]) >= 1970);
}

/** The requested YYYY-MM when it is a real month, else the fallback with the bad value reported. */
export function parseCalendarMonth(value: string | undefined, fallback: string) {
  if (!value) return { month: fallback, invalid: null };
  return isCalendarMonth(value) ? { month: value, invalid: null } : { month: fallback, invalid: String(value).slice(0, 40) };
}

export function nextCalendarMonth(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 7);
}

export function calendarPath(params: { month?: string | null; page?: string | null; holds?: string | null; error?: string | null } = {}) {
  const search = new URLSearchParams();
  if (isCalendarMonth(params.month)) search.set('month', params.month);
  if (params.page && /^\d{1,4}$/.test(params.page) && params.page !== '1') search.set('page', params.page);
  if (params.holds && /^\d{1,5}$/.test(params.holds) && params.holds !== '1') search.set('holds', params.holds);
  if (params.error) search.set('error', params.error);
  const query = search.toString();
  return query ? `${CALENDAR_PATH}?${query}` : CALENDAR_PATH;
}

export function calendarErrorPath(message: string, month?: string | null, page?: string | null) {
  return calendarPath({ month, page, error: message });
}
