'use client';

import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Search } from 'lucide-react';
import { Children, isValidElement, useId, useMemo, useRef, useState, type ChangeEvent, type ComponentProps, type KeyboardEvent, type ReactNode } from 'react';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { PLATFORM_LOCALE } from '../lib/operations';

/*
 * Popover replacements for native <select>, date, month and time inputs. They keep the native
 * contract (name, value/defaultValue, required, disabled, onChange(event.target.value)) and post
 * through a hidden input, so server actions and GET forms read them unchanged.
 */

const triggerClass = 'flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm shadow-xs outline-none transition-[color,box-shadow] hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive';

type Option = { value: string; label: string; disabled?: boolean };

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

function optionsOf(children: ReactNode): Option[] {
  const out: Option[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: unknown; disabled?: boolean; children?: ReactNode }>(child)) return;
    if (child.type === 'option') {
      const label = textOf(child.props.children);
      out.push({ value: child.props.value == null ? label : String(child.props.value), label, disabled: child.props.disabled });
    } else out.push(...optionsOf(child.props.children));
  });
  return out;
}

/** A hidden, unfocusable input that keeps `required` blocking submit for a popover field. */
function RequiredProxy({ value, disabled, onInvalid }: { value: string; disabled?: boolean; onInvalid?: () => void }) {
  return <input tabIndex={-1} aria-hidden="true" required disabled={disabled} value={value} onChange={() => {}} onInvalid={(event) => { event.preventDefault(); onInvalid?.(); }} className="pointer-events-none absolute h-px w-px opacity-0" />;
}

function changeEvent(name: string | undefined, value: string) {
  const target = { name, value } as HTMLSelectElement & HTMLInputElement;
  return { target, currentTarget: target } as unknown as ChangeEvent<HTMLSelectElement> & ChangeEvent<HTMLInputElement>;
}

function useFieldValue(value: unknown, defaultValue: unknown) {
  const [inner, setInner] = useState(defaultValue == null ? '' : String(defaultValue));
  const controlled = value !== undefined;
  return [controlled ? String(value ?? '') : inner, (next: string) => { if (!controlled) setInner(next); }] as const;
}

type OptionListProps = {
  options: Option[];
  current: string;
  onChoose: (value: string) => void;
  searchable: boolean;
  label?: string;
};

function OptionList({ options, current, onChoose, searchable, label }: OptionListProps) {
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const needle = query.trim().toLowerCase();
  const shown = needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;
  const items = () => Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role=option]:not(:disabled)') ?? []);
  function onKeyDown(event: KeyboardEvent) {
    const list = items(); const index = list.indexOf(document.activeElement as HTMLButtonElement);
    const move = (to: number) => { event.preventDefault(); list[Math.max(0, Math.min(list.length - 1, to))]?.focus(); };
    if (event.key === 'ArrowDown') move(index + 1);
    else if (event.key === 'ArrowUp') move(index - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(list.length - 1);
  }
  return <>
    {searchable ? <div className="relative border-b p-1 pb-2">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-[calc(50%-0.25rem)] size-4 -translate-y-1/2 text-muted-foreground" />
      <input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search options"
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); items()[0]?.focus(); }
          if (event.key === 'Enter') { event.preventDefault(); const first = shown.find((option) => !option.disabled); if (first) onChoose(first.value); }
        }}
        className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40" />
    </div> : null}
    <div ref={listRef} role="listbox" aria-label={label} onKeyDown={onKeyDown} className="max-h-72 overflow-y-auto overscroll-contain py-1">
      {shown.length === 0 ? <p className="px-2.5 py-2 text-sm text-muted-foreground">No matches</p> : null}
      {shown.map((option) => {
        const selected = option.value === current;
        return <button key={option.value || '__empty'} type="button" role="option" aria-selected={selected} disabled={option.disabled} onClick={() => onChoose(option.value)}
          ref={(node) => { if (node && selected && !searchable) node.scrollIntoView({ block: 'nearest' }); }}
          className="flex min-h-10 w-full items-center gap-2 rounded-sm px-2.5 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted disabled:opacity-50 aria-selected:font-medium">
          <Check aria-hidden="true" className={cn('size-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
          <span className="min-w-0 flex-1 break-words">{option.label}</span>
        </button>;
      })}
    </div>
  </>;
}

/** Drop-in for <select>: same props, <option> children, opens a popover list. */
export function PopoverSelect({ className, children, name, value, defaultValue, onChange, required, disabled, id, ...rest }: ComponentProps<'select'>) {
  const options = useMemo(() => optionsOf(children), [children]);
  const firstEnabled = options.find((option) => !option.disabled)?.value ?? '';
  const [current, setCurrent] = useFieldValue(value, defaultValue ?? (options.some((option) => option.value === '') ? '' : firstEnabled));
  const [open, setOpen] = useState(false);
  const listId = useId();
  const selected = options.find((option) => option.value === current);
  const placeholder = options.find((option) => option.value === '')?.label || 'Select';
  function choose(next: string) { setCurrent(next); onChange?.(changeEvent(name, next)); setOpen(false); }
  return <>
    {name ? <input type="hidden" name={name} value={current} disabled={disabled} /> : null}
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button type="button" id={id} role="combobox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-haspopup="listbox"
          aria-label={rest['aria-label']} aria-invalid={rest['aria-invalid']} aria-describedby={rest['aria-describedby']} className={cn(triggerClass, 'justify-between', className)}>
          <span className={cn('min-w-0 truncate', (!selected || selected.value === '') && 'text-muted-foreground')}>{selected?.label || placeholder}</span>
          <ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent id={listId} align="start" sideOffset={4} collisionPadding={12} className="w-[var(--radix-popover-trigger-width)] min-w-[12rem] max-w-[calc(100vw-1.5rem)] p-1">
        <OptionList options={options.filter((option) => option.value !== '' || !option.disabled)} current={current} onChoose={choose} searchable={options.length > 12} label={rest['aria-label']} />
      </PopoverContent>
    </Popover>
    {required ? <RequiredProxy value={current} disabled={disabled} onInvalid={() => setOpen(true)} /> : null}
  </>;
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
}
function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
const dateLabel = new Intl.DateTimeFormat(PLATFORM_LOCALE, { month: 'short', day: 'numeric', year: 'numeric' });
const monthLabel = new Intl.DateTimeFormat(PLATFORM_LOCALE, { month: 'long', year: 'numeric' });
const monthShort = new Intl.DateTimeFormat(PLATFORM_LOCALE, { month: 'short' });
const timeLabel = new Intl.DateTimeFormat(PLATFORM_LOCALE, { hour: 'numeric', minute: '2-digit' });

type TemporalProps = Omit<ComponentProps<'input'>, 'type'> & { type: 'date' | 'month' | 'time' };

/** Drop-in for <input type="date|month|time">: same value strings, opens a popover. */
export function PopoverTemporalInput({ type, className, name, value, defaultValue, onChange, required, disabled, id, min, max, placeholder, ...rest }: TemporalProps) {
  const [current, setCurrent] = useFieldValue(value, defaultValue);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number((current || isoDate(new Date())).slice(0, 4)));
  function set(next: string) { setCurrent(next); onChange?.(changeEvent(name, next)); }
  const minText = min == null ? '' : String(min); const maxText = max == null ? '' : String(max);

  let shown = '';
  if (type === 'date') { const d = parseIsoDate(current); shown = d ? dateLabel.format(d) : ''; }
  if (type === 'month' && /^\d{4}-\d{2}$/.test(current)) shown = monthLabel.format(new Date(Number(current.slice(0, 4)), Number(current.slice(5, 7)) - 1, 1));
  if (type === 'time' && /^\d{2}:\d{2}/.test(current)) shown = timeLabel.format(new Date(2000, 0, 1, Number(current.slice(0, 2)), Number(current.slice(3, 5))));
  const Icon = type === 'time' ? Clock : CalendarDays;
  const empty = type === 'time' ? 'Choose a time' : type === 'month' ? 'Choose a month' : 'Pick a date';

  const times = useMemo(() => {
    if (type !== 'time') return [];
    const list: Option[] = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
      const v = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      list.push({ value: v, label: timeLabel.format(new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60)) });
    }
    if (/^\d{2}:\d{2}$/.test(current) && !list.some((o) => o.value === current)) list.push({ value: current, label: shown });
    return list.sort((a, b) => a.value.localeCompare(b.value));
  }, [type, current, shown]);

  return <>
    {name ? <input type="hidden" name={name} value={current} disabled={disabled} /> : null}
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button type="button" id={id} aria-haspopup="dialog" aria-expanded={open} aria-label={rest['aria-label']} aria-invalid={rest['aria-invalid']} aria-describedby={rest['aria-describedby']} className={cn(triggerClass, className)}>
          <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn('min-w-0 truncate tabular-nums', !shown && 'text-muted-foreground')}>{shown || placeholder || empty}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} collisionPadding={12} className={cn('max-w-[calc(100vw-1.5rem)] p-2', type === 'time' ? 'w-[var(--radix-popover-trigger-width)] min-w-[12rem] p-1' : 'w-auto')}>
        {type === 'date' ? <Calendar mode="single" weekStartsOn={1} autoFocus selected={parseIsoDate(current)} defaultMonth={parseIsoDate(current) ?? parseIsoDate(minText)}
          disabled={[...(parseIsoDate(minText) ? [{ before: parseIsoDate(minText)! }] : []), ...(parseIsoDate(maxText) ? [{ after: parseIsoDate(maxText)! }] : [])]}
          onSelect={(day) => { set(day ? isoDate(day) : ''); setOpen(false); }} /> : null}
        {type === 'month' ? <div className="w-64">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Previous year" onClick={() => setYear(year - 1)} className="grid size-9 place-items-center rounded-md hover:bg-muted"><ChevronLeft aria-hidden="true" className="size-4" /></button>
            <span className="text-sm font-medium tabular-nums">{year}</span>
            <button type="button" aria-label="Next year" onClick={() => setYear(year + 1)} className="grid size-9 place-items-center rounded-md hover:bg-muted"><ChevronRight aria-hidden="true" className="size-4" /></button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 12 }, (_, index) => {
              const v = `${year}-${String(index + 1).padStart(2, '0')}`;
              return <button key={v} type="button" aria-pressed={v === current} onClick={() => { set(v); setOpen(false); }}
                className={cn('h-10 rounded-md text-sm hover:bg-muted', v === current && 'bg-primary text-primary-foreground hover:bg-primary')}>{monthShort.format(new Date(year, index, 1))}</button>;
            })}
          </div>
        </div> : null}
        {type === 'time' ? <OptionList options={times} current={current} onChoose={(v) => { set(v); setOpen(false); }} searchable label={rest['aria-label']} /> : null}
        {!required && current && type !== 'time' ? <div className="mt-2 flex justify-end border-t pt-2">
          <button type="button" onClick={() => { set(''); setOpen(false); }} className="min-h-9 rounded-md px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">Clear</button>
        </div> : null}
      </PopoverContent>
    </Popover>
    {required ? <RequiredProxy value={current} disabled={disabled} onInvalid={() => setOpen(true)} /> : null}
  </>;
}
