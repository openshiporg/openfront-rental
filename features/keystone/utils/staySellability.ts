export function isAccommodationUnitBookable(status: unknown): boolean {
  return status === 'available';
}

export function assertAccommodationUnitBookable(status: unknown): void {
  if (!isAccommodationUnitBookable(status)) {
    throw new Error('This stay is not available for booking.');
  }
}
