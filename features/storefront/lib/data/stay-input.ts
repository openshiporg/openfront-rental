const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function dateOnlyTimestamp(value: string, label: string) {
  if (!DATE_ONLY.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD format.`);
  }

  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new Error(`${label} must be a valid calendar date.`);
  }
  return timestamp;
}

export function validateStayDateRange(checkIn: string, checkOut: string, now = new Date()) {
  const checkInTimestamp = dateOnlyTimestamp(checkIn, 'Check-in');
  const checkOutTimestamp = dateOnlyTimestamp(checkOut, 'Check-out');
  // Only dates past everywhere (UTC-12) are refused here; the property's local date is
  // the real rule and is applied by the server for each home.
  const earliest = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const todayTimestamp = Date.UTC(earliest.getUTCFullYear(), earliest.getUTCMonth(), earliest.getUTCDate());
  if (checkInTimestamp < todayTimestamp) {
    throw new Error('Check-in cannot be in the past.');
  }
  if (checkOutTimestamp <= checkInTimestamp) {
    throw new Error('Check-out must be after check-in.');
  }
}

export function validateOptionalStayDateRange(checkIn?: string, checkOut?: string, now = new Date()) {
  if (!checkIn && !checkOut) return;
  if (!checkIn || !checkOut) {
    throw new Error('Choose both check-in and check-out dates.');
  }
  validateStayDateRange(checkIn, checkOut, now);
}
