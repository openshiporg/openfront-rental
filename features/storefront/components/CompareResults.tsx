'use client';
import { useState } from 'react';
import { StayCard } from './StayCard';
import type { PublicStay } from '../lib/data/stays';
export function CompareResults({ stays, query }: { stays: PublicStay[]; query: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  return <>
    <div className="stay-compare-intro"><p>Select up to three homes to compare the details.</p><span role="status" aria-live="polite">{selected.length} of 3 selected</span></div>
    <div className="stay-card-grid stay-results">{stays.map((stay, index) => <div className="stay-result-item" key={stay.id}><StayCard stay={stay} priority={index < 2} searchQuery={query} /><label className="stay-compare-choice"><input type="checkbox" checked={selected.includes(stay.slug)} disabled={selected.length === 3 && !selected.includes(stay.slug)} onChange={event => setSelected(event.target.checked ? [...selected, stay.slug] : selected.filter(slug => slug !== stay.slug))} />Compare <span className="stay-visually-hidden">{stay.title}</span></label></div>)}</div>
    {selected.length ? <form action="/compare" className="stay-comparison-tray" aria-label="Selected homes">{[...new URLSearchParams(query)].filter(([key]) => key !== 'offset').map(([key, value]) => <input type="hidden" key={key} name={key} value={value} />)}{selected.map(slug => <input type="hidden" name="home" key={slug} value={slug} />)}<p>{selected.length} {selected.length === 1 ? 'home' : 'homes'} selected</p><button className="stay-button" type="submit">Compare homes ↗</button><button className="stay-plain-button" type="button" onClick={() => setSelected([])}>Clear</button></form> : null}
  </>;
}
