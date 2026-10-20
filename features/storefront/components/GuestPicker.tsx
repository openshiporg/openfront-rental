'use client';

import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { useId, type ReactNode } from 'react';

import { formatGuestParty } from '../lib/format';

export type GuestParty = { adults: number; children: number; infants: number; pets: number };

export function Stepper({ label, hint, value, min, max, onChange, disabledReason }: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabledReason?: string;
}) {
  const id = useId();
  const locked = Boolean(disabledReason);
  return (
    <div className="stay-stepper" role="group" aria-labelledby={`${id}-label`} aria-describedby={hint || disabledReason ? `${id}-hint` : undefined}>
      <div className="stay-stepper-copy">
        <span id={`${id}-label`} className="stay-stepper-label">{label}</span>
        {hint || disabledReason ? <span id={`${id}-hint`} className="stay-stepper-hint">{disabledReason || hint}</span> : null}
      </div>
      <div className="stay-stepper-controls">
        {/* A locked count can still go down to its minimum, so a disallowed selection can be removed. */}
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}><Minus size={15} aria-hidden="true" /></button>
        <output aria-live="polite" aria-label={`${value} ${label.toLowerCase()}`}>{value}</output>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={locked || value >= max} onClick={() => onChange(value + 1)}><Plus size={15} aria-hidden="true" /></button>
      </div>
    </div>
  );
}

/** Popover kept inside `.stay-root` (no portal) so storefront tokens apply. */
export function StayPopover({ trigger, children, label, align = 'start', className = '', open, onOpenChange }: {
  trigger: ReactNode;
  children: ReactNode;
  label: string;
  align?: 'start' | 'center' | 'end';
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Content className={`stay-popover ${className}`} align={align} sideOffset={10} collisionPadding={12} aria-label={label}>
        {children}
      </Popover.Content>
    </Popover.Root>
  );
}

/** "3 guests · 1 pet" — the short form for the compact trigger. */
function compactParty({ adults, children, infants, pets }: GuestParty) {
  const seated = adults + children;
  const parts = [`${seated} ${seated === 1 ? 'guest' : 'guests'}`];
  if (infants) parts.push(`${infants} ${infants === 1 ? 'infant' : 'infants'}`);
  if (pets) parts.push(`${pets} ${pets === 1 ? 'pet' : 'pets'}`);
  return parts.join(' · ');
}

export function GuestPicker({ value, onChange, maxGuests, petsAllowed = true, label = 'Guests', className = '', variant = 'field' }: {
  value: GuestParty;
  onChange: (value: GuestParty) => void;
  maxGuests?: number;
  petsAllowed?: boolean;
  label?: string;
  className?: string;
  /** `compact` is the small labelled control in the booking card's top row. */
  variant?: 'field' | 'compact';
}) {
  const capacity = maxGuests ?? 16;
  const seated = value.adults + value.children;
  const set = (key: keyof GuestParty) => (next: number) => onChange({ ...value, [key]: next });
  return (
    <StayPopover
      label="Choose guests"
      className="stay-guest-popover"
      align={variant === 'compact' ? 'end' : 'start'}
      trigger={variant === 'compact' ? (
        <button type="button" className={`stay-guest-compact ${className}`} aria-label={`${label}: ${formatGuestParty(value)}`}>
          <span className="stay-guest-compact-label">{label}</span>
          <span className="stay-guest-compact-value">{compactParty(value)}</span>
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      ) : (
        <button type="button" className={`stay-field stay-field-button ${className}`}>
          <span className="stay-field-label">{label}</span>
          <span className="stay-field-value">{formatGuestParty(value)}</span>
          <ChevronDown className="stay-field-chevron" size={16} aria-hidden="true" />
        </button>
      )}
    >
      <Stepper label="Adults" value={value.adults} min={1} max={Math.max(1, capacity - value.children)} onChange={set('adults')} />
      <Stepper label="Children" value={value.children} min={0} max={Math.min(12, Math.max(0, capacity - value.adults))} onChange={set('children')} />
      <Stepper label="Infants" hint="Not counted toward capacity" value={value.infants} min={0} max={5} onChange={set('infants')} />
      <Stepper label="Pets" hint="Pet rules are confirmed in your quote" value={value.pets} min={0} max={4} onChange={set('pets')} disabledReason={petsAllowed ? undefined : value.pets > 0 ? 'This home does not allow pets. Remove them to continue.' : 'This home does not allow pets'} />
      {maxGuests ? <p className="stay-popover-note">{seated >= capacity ? `This home sleeps up to ${capacity}. ` : `Up to ${capacity} guests. `}Infants don’t count toward the limit.</p> : null}
      <Popover.Close className="stay-popover-done">Done</Popover.Close>
    </StayPopover>
  );
}
