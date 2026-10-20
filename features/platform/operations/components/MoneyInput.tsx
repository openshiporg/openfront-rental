'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { decimalTextToMinorUnits, minorUnitsToDecimalText, safeMinorUnitDigits } from '../lib/currency-units';

/** The amount's currency: a fixed code, or the name of a field in the same form that holds it. */
type CurrencySource = { currencyCode: string; currencyFrom?: string } | { currencyCode?: string; currencyFrom: string };

type MoneyInputProps = Omit<ComponentProps<'input'>, 'name' | 'defaultValue' | 'value' | 'onChange' | 'type' | 'step'>
  & CurrencySource
  & { name: string; defaultCents?: number | null; suffix?: string };

/**
 * Operators type money in currency units ("185.50", or "18550" for JPY); the form posts the
 * integer minor units at the currency's ISO scale under `name`, which is what the server actions
 * validate and store. `defaultCents` of 0 shows an explicit zero; leave it out for a blank field.
 * With `currencyFrom`, pass the field's initial code as `currencyCode` so a default or a
 * rejected-and-returned amount is shown at the right scale from the first render.
 */
export function MoneyInput({ name, currencyCode, currencyFrom, defaultCents, suffix, className, ...props }: MoneyInputProps) {
  const fixed = (currencyCode || '').trim().toUpperCase();
  const [fieldCurrency, setFieldCurrency] = useState<string | null>(null);
  const currency = currencyFrom ? fieldCurrency ?? fixed : fixed;
  const digits = safeMinorUnitDigits(currency);
  const initialDigits = safeMinorUnitDigits(fixed);
  // A default the currency can't scale yet waits for the form's currency rather than being dropped.
  const [pendingCents, setPendingCents] = useState(() => defaultCents != null && initialDigits == null ? defaultCents : null);
  const [value, setValue] = useState(() => defaultCents != null && initialDigits != null ? minorUnitsToDecimalText(defaultCents, initialDigits) : '');
  const input = useRef<HTMLInputElement>(null);
  const hidden = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const form = hidden.current?.form;
    if (!currencyFrom || !form) return;
    const read = () => {
      const field = form.elements.namedItem(currencyFrom);
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) setFieldCurrency(field.value.trim().toUpperCase());
    };
    read();
    form.addEventListener('input', read);
    form.addEventListener('change', read);
    return () => {
      form.removeEventListener('input', read);
      form.removeEventListener('change', read);
    };
  }, [currencyFrom]);

  useEffect(() => {
    if (pendingCents == null || digits == null) return;
    setValue(minorUnitsToDecimalText(pendingCents, digits));
    setPendingCents(null);
  }, [pendingCents, digits]);

  const minor = digits == null || !value ? null : decimalTextToMinorUnits(value, digits);

  useEffect(() => {
    // An amount the currency can't hold exactly (no currency yet, or more decimals than it uses,
    // e.g. after switching USD to JPY) is never rescaled silently: the browser holds the submit.
    input.current?.setCustomValidity(
      value && digits == null ? 'Enter a valid currency code first.'
        : value && minor == null
          ? /^\d*\.\d+$/.test(value.trim()) ? (digits ? `Use up to ${digits} decimal places for ${currency}.` : `${currency} amounts have no decimal places.`) : 'Enter an amount of zero or more.'
          : '',
    );
  }, [value, digits, minor, currency]);

  const label = props['aria-label'];
  return <div className="relative min-w-0">
    {currency ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">{currency}</span> : null}
    <Input
      ref={input}
      type="number"
      inputMode={digits === 0 ? 'numeric' : 'decimal'}
      min={0}
      step={digits ? (1 / 10 ** digits).toFixed(digits) : '1'}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      className={cn('h-9 px-3 text-sm tabular-nums', currency && 'pl-12', suffix && 'pr-20', className)}
      {...props}
      aria-label={label && currency ? `${label} (${currency})` : label}
    />
    {suffix ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span> : null}
    <input ref={hidden} type="hidden" name={name} value={minor != null && minor >= 0 ? String(minor) : ''} />
  </div>;
}
