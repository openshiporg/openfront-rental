'use client';

import { shortDate, weekday } from '../lib/dates';
import type { StayRange } from './StayCalendar';
import { useStorefrontLocale } from './StorefrontLocale';

/**
 * Joined check-in → checkout switcher (Oil UI stay `.date-fields`). Each half
 * shows the chosen day and weekday; the half being chosen is tinted, and
 * pressing a half hands the next calendar click to that end of the stay.
 */
export function StayDateSwitch({ range, onEdit, label = 'Stay dates' }: {
  range: StayRange;
  onEdit: (field: 'checkIn' | 'checkOut') => void;
  label?: string;
}) {
  const locale = useStorefrontLocale();
  const editingIn = range.mode === 'checkIn';
  const editingOut = range.mode === 'checkOut' && Boolean(range.checkIn);
  return (
    <div className="stay-date-switch" role="group" aria-label={label}>
      <button type="button" className={`stay-date-seg ${editingIn ? 'is-editing' : ''}`} aria-current={editingIn || undefined} onClick={() => onEdit('checkIn')}>
        <span className="stay-date-seg-label">Check-in</span>
        {range.checkIn
          ? <><b>{shortDate(locale, range.checkIn)}</b><small>{weekday(locale, range.checkIn)}</small></>
          : <b className="is-empty">Add date</b>}
      </button>
      <span className="stay-date-switch-arrow" aria-hidden="true">→</span>
      <button type="button" className={`stay-date-seg ${editingOut ? 'is-editing' : ''}`} aria-current={editingOut || undefined} onClick={() => onEdit('checkOut')} disabled={!range.checkIn}>
        <span className="stay-date-seg-label">Checkout</span>
        {range.checkOut
          ? <><b>{shortDate(locale, range.checkOut)}</b><small>{weekday(locale, range.checkOut)}</small></>
          : <b className="is-empty">{range.checkIn ? 'Choose checkout' : 'Add date'}</b>}
      </button>
    </div>
  );
}
