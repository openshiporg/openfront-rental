import Link from 'next/link';
export function SectionNav({ items, label = 'On this page' }: { items: { id: string; label: string }[]; label?: string }) {
  return <nav className="stay-section-nav" aria-label={label}>{items.map(item => <a key={item.id} href={`#${item.id}`}>{item.label}</a>)}</nav>;
}
export function BookingSteps({ step }: { step: 1 | 2 | 3 }) {
  return <ol className="stay-booking-steps" aria-label="Booking progress">{['Choose your home', 'Review & reserve', 'Your trip'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined}><span>{String(index + 1).padStart(2, '0')}</span>{label}</li>)}</ol>;
}
export function UnavailableStay({ title, children }: { title: string; children: React.ReactNode }) {
  return <main id="stay-main" className="stay-shell stay-token-page"><p className="stay-overline">A little help getting back</p><h1>{title}</h1><p>{children}</p><div className="stay-inline-actions"><Link className="stay-button" href="/search">Find a stay</Link><Link href="/trips">Open your trip</Link><Link href="/help">Get help</Link></div></main>;
}
