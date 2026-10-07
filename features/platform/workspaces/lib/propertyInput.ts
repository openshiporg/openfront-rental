export function normalizePropertyInternalCode(value: string) {
  return value.trim();
}

export function isValidIanaTimeZone(value: string) {
  if (!/^[A-Za-z_]+(?:\/[A-Za-z_+-]+)+$/.test(value)) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
