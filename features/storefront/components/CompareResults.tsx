'use client';

import { Check, Columns3, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { COMPARE_LIMIT, readStoredSelection, urlSelection, writeStoredSelection, writeUrlSelection } from '../lib/compare-selection';
import type { PublicStay } from '../lib/data/stays';
import { StayCard } from './StayCard';
import { useStorefrontLocale } from './StorefrontLocale';

/**
 * Comparison picks on results pages: one bounded selection (at most three homes) kept in
 * this tab's storage and in this page's URL. Removing a home frees its slot everywhere.
 */
export function CompareResults({ stays, query }: { stays: PublicStay[]; query: string }) {
  const locale = useStorefrontLocale();
  const [selected, setSelectedState] = useState<string[]>([]);
  const [storing, setStoring] = useState(true);
  useEffect(() => {
    const restore = () => {
      const stored = readStoredSelection();
      const fromUrl = urlSelection();
      setStoring(stored !== null);
      setSelectedState(fromUrl.length ? fromUrl : stored || []);
    };
    restore();
    // Back/forward (and returning from the compare page) show the current choices.
    window.addEventListener('pageshow', restore);
    window.addEventListener('popstate', restore);
    return () => { window.removeEventListener('pageshow', restore); window.removeEventListener('popstate', restore); };
  }, []);
  const setSelected = (next: string[]) => {
    setSelectedState(next);
    setStoring(writeStoredSelection(next));
    writeUrlSelection(next);
  };
  const full = selected.length >= COMPARE_LIMIT;
  return (
    <>
      <div className="stay-results-grid">
        {stays.map((stay, index) => {
          const chosen = selected.includes(stay.slug);
          return (
            <StayCard
              locale={locale}
              key={stay.id}
              stay={stay}
              priority={index < 3}
              searchQuery={query}
              overlay={(
                <button
                  type="button"
                  className={`stay-compare-toggle ${chosen ? 'is-chosen' : ''}`}
                  aria-pressed={chosen}
                  disabled={full && !chosen}
                  onClick={() => setSelected(chosen ? selected.filter(slug => slug !== stay.slug) : [...selected, stay.slug])}
                >
                  {chosen ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                  <span>{chosen ? 'Comparing' : 'Compare'}</span>
                  <span className="stay-visually-hidden"> {stay.title}</span>
                </button>
              )}
            />
          );
        })}
      </div>
      <p className="stay-visually-hidden" role="status" aria-live="polite">{selected.length} of 3 homes selected to compare</p>
      {selected.length ? (
        <form action="/compare" className="stay-compare-dock" aria-label="Selected homes">
          {[...new URLSearchParams(query)].filter(([key]) => key !== 'offset' && key !== 'home').map(([key, value]) => <input type="hidden" key={key} name={key} value={value} />)}
          {selected.map(slug => <input type="hidden" name="home" key={slug} value={slug} />)}
          <span className="stay-compare-dock-count" aria-hidden="true">{[0, 1, 2].map(slot => <span key={slot} className={slot < selected.length ? 'is-filled' : ''} />)}</span>
          <p><strong>{selected.length} of 3</strong> selected{selected.some(slug => !stays.some(stay => stay.slug === slug)) ? ' · including homes from other pages' : ''}{storing ? '' : ' · this browser isn’t saving picks, so they last only on this page'}</p>
          <button type="button" className="stay-icon-button" onClick={() => setSelected([])} aria-label="Clear comparison"><X size={16} aria-hidden="true" /></button>
          <button className="stay-button" type="submit" disabled={selected.length < 2}><Columns3 size={16} aria-hidden="true" />{selected.length < 2 ? 'Pick one more' : 'Compare side by side'}</button>
        </form>
      ) : null}
    </>
  );
}
