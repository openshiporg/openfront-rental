import { formatHomeCount } from './format';

export function searchResultCopy({ totalCount, error, checkIn, checkOut }: {
  totalCount: number;
  error?: string | null;
  checkIn?: string;
  checkOut?: string;
}) {
  if (error) return {
    heading: 'Search needs another look',
    description: 'Results are unavailable. Review the message below or reset your search.',
  };
  return {
    heading: `${formatHomeCount(totalCount)} matching your search`,
    description: checkIn && checkOut
      ? 'Price previews for your dates · final availability checked at booking'
      : 'Add dates for total pricing · final availability checked at booking',
  };
}
