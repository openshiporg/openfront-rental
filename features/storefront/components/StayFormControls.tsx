'use client';

import { CalendarDays, Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { Calendar } from '@/components/ui/calendar';
import { StayPopover } from './GuestPicker';
import { useStorefrontLocale } from './StorefrontLocale';
import { longDate } from '../lib/dates';

const pad = (value: number) => String(value).padStart(2, '0');
const toIso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromIso = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : undefined);

/** Popover list that posts through a hidden input, replacing a native <select>. */
export function StaySelect({ name, value, defaultValue = '', onChange, options, placeholder = 'Choose', required = false, label }: {
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
  label: string;
}) {
  const [inner, setInner] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const current = value ?? inner;
  const selected = options.find(option => option.value === current);
  const choose = (next: string) => { setInner(next); onChange?.(next); setOpen(false); };
  return <>
    <input type="hidden" name={name} value={current} />
    {required ? <input tabIndex={-1} aria-hidden="true" required value={current} onChange={() => {}} className="stay-visually-hidden" /> : null}
    <StayPopover open={open} onOpenChange={setOpen} label={label} className="stay-select-popover" trigger={
      <button type="button" className="stay-picker-trigger" aria-haspopup="listbox" aria-expanded={open} aria-label={label}>
        <span className={selected ? '' : 'stay-picker-empty'}>{selected?.label || placeholder}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
    }>
      <div role="listbox" aria-label={label} className="stay-select-list">
        {options.map(option => <button key={option.value || '__none'} type="button" role="option" aria-selected={option.value === current} onClick={() => choose(option.value)}>
          <Check size={15} aria-hidden="true" style={{ opacity: option.value === current ? 1 : 0 }} />{option.label}
        </button>)}
      </div>
    </StayPopover>
  </>;
}

/** Popover calendar that posts a YYYY-MM-DD value, replacing a native date input. */
export function StayDateField({ name, defaultValue = '', label, min }: { name: string; defaultValue?: string; label: string; min?: string }) {
  const locale = useStorefrontLocale();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const minDate = min ? fromIso(min) : undefined;
  return <>
    <input type="hidden" name={name} value={value} />
    <StayPopover open={open} onOpenChange={setOpen} label={label} className="stay-date-popover" trigger={
      <button type="button" className="stay-picker-trigger" aria-haspopup="dialog" aria-expanded={open} aria-label={label}>
        <CalendarDays size={16} aria-hidden="true" />
        <span className={value ? '' : 'stay-picker-empty'}>{value ? longDate(locale, value) : 'Keep as booked'}</span>
      </button>
    }>
      <Calendar mode="single" selected={fromIso(value)} defaultMonth={fromIso(value) ?? minDate} disabled={minDate ? { before: minDate } : undefined}
        onSelect={day => { setValue(day ? toIso(day) : ''); setOpen(false); }} />
      {value ? <button type="button" className="stay-picker-clear" onClick={() => { setValue(''); setOpen(false); }}>Keep as booked</button> : null}
    </StayPopover>
  </>;
}
