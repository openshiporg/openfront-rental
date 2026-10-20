import { Check, Compass } from 'lucide-react';
import Link from 'next/link';

export { SectionNav } from './SectionNav';

const steps = ['Choose your dates', 'Review & reserve', 'Your trip'];

export function BookingSteps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol className="stay-steps" aria-label="Booking progress">
      {steps.map((label, index) => {
        const position = index + 1;
        const state = position < step ? 'done' : position === step ? 'current' : 'upcoming';
        return (
          <li key={label} className={`is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="stay-steps-dot" aria-hidden="true">{state === 'done' ? <Check size={12} /> : position}</span>
            <span>{label}{state === 'done' ? <span className="stay-visually-hidden"> (complete)</span> : null}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function UnavailableStay({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main id="stay-main" className="stay-shell stay-state-page">
      <div className="stay-state-card">
        <span className="stay-state-icon" aria-hidden="true"><Compass size={22} /></span>
        <p className="stay-overline">A little help getting back</p>
        <h1>{title}</h1>
        <p>{children}</p>
        <div className="stay-actions">
          <Link className="stay-button" href="/search">Find a stay</Link>
          <Link className="stay-button stay-button-quiet" href="/trips">Open your trip</Link>
          <Link className="stay-text-link" href="/help">Get help</Link>
        </div>
      </div>
    </main>
  );
}
