'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { storefrontNav } from '../lib/navigation';

export function StorefrontNavigation({ active }: { active: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    const outside = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('keydown', dismiss); document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', dismiss); document.removeEventListener('pointerdown', outside); };
  }, [open]);
  return <>
    <nav className="stay-desktop-nav" aria-label="Primary navigation">{storefrontNav.map(item => <Link key={item.key} href={item.href} aria-current={active === item.key ? 'page' : undefined}>{item.label}</Link>)}</nav>
    <button ref={trigger} type="button" className="stay-menu-toggle" aria-expanded={open} aria-controls="stay-mobile-navigation" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'} <span aria-hidden="true">{open ? '×' : '+'}</span></button>
    <div ref={menu} id="stay-mobile-navigation" className="stay-mobile-navigation" hidden={!open}>
      <nav aria-label="Mobile navigation">{storefrontNav.map(item => <Link key={item.key} href={item.href} aria-current={active === item.key ? 'page' : undefined} onClick={() => setOpen(false)}>{item.label}<span aria-hidden="true">↗</span></Link>)}</nav>
      <p>Find your place. Make yourself at home.</p>
    </div>
  </>;
}
