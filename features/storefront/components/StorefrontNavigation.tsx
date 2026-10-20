'use client';

import { ArrowUpRight, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { storefrontNav } from '../lib/navigation';

export function StorefrontNavigation({ active, brandName, brandMark, tagline }: { active: string; brandName: string; brandMark?: ReactNode; tagline?: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheet.current?.querySelector<HTMLElement>('a')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
      if (event.key === 'Tab' && sheet.current) {
        const items = Array.from(sheet.current.querySelectorAll<HTMLElement>('a, button'));
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <>
      <nav className="stay-desktop-nav" aria-label="Primary navigation">
        {storefrontNav.filter(item => item.key !== 'trips').map(item => (
          <Link key={item.key} href={item.href} aria-current={active === item.key ? 'page' : undefined}>{item.label}</Link>
        ))}
      </nav>
      <Link href="/trips" className="stay-nav-trip" aria-current={active === 'trips' ? 'page' : undefined}>Your trip</Link>
      <button ref={trigger} type="button" className="stay-menu-toggle" aria-expanded={open} aria-controls="stay-mobile-navigation" onClick={() => setOpen(true)}>
        <Menu size={20} aria-hidden="true" /><span className="stay-visually-hidden">Open menu</span>
      </button>
      <div ref={sheet} id="stay-mobile-navigation" className="stay-sheet" hidden={!open} role="dialog" aria-modal="true" aria-label="Menu">
        <div className="stay-sheet-head">
          <span className="stay-wordmark">{brandMark}{brandName}</span>
          <button type="button" className="stay-icon-button" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={20} aria-hidden="true" /><span className="stay-visually-hidden">Close menu</span></button>
        </div>
        <nav aria-label="Mobile navigation" className="stay-sheet-nav">
          <Link href="/" onClick={() => setOpen(false)} aria-current={active === 'home' ? 'page' : undefined}>Home<ArrowUpRight size={20} aria-hidden="true" /></Link>
          {storefrontNav.map(item => (
            <Link key={item.key} href={item.href} aria-current={active === item.key ? 'page' : undefined} onClick={() => setOpen(false)}>{item.label}<ArrowUpRight size={20} aria-hidden="true" /></Link>
          ))}
          <Link href="/policies" onClick={() => setOpen(false)}>Booking & policies<ArrowUpRight size={20} aria-hidden="true" /></Link>
        </nav>
        {tagline ? <p className="stay-sheet-note">{tagline}</p> : null}
      </div>
    </>
  );
}
