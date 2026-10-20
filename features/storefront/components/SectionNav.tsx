'use client';

import { useEffect, useState } from 'react';

/** Sticky in-page navigation that highlights the section being read. */
export function SectionNav({ items, label = 'On this page', className = '' }: { items: { id: string; label: string }[]; label?: string; className?: string }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const targets = items.map(item => document.getElementById(item.id)).filter((node): node is HTMLElement => Boolean(node));
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-20% 0px -65% 0px' });
    targets.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [items]);
  return (
    <nav className={`stay-section-nav ${className}`} aria-label={label}>
      <div className="stay-section-nav-track">
        {items.map(item => <a key={item.id} href={`#${item.id}`} aria-current={active === item.id ? 'location' : undefined} onClick={() => setActive(item.id)}>{item.label}</a>)}
      </div>
    </nav>
  );
}
