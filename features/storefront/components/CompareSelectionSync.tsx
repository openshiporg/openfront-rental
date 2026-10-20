'use client';

import { useEffect } from 'react';

import { writeStoredSelection } from '../lib/compare-selection';

/**
 * Mirrors the compare page's own selection (its URL) into this tab's storage whenever the
 * page shows a selection, including after a removal or back/forward navigation.
 */
export function CompareSelectionSync({ slugs }: { slugs: string[] }) {
  const key = slugs.join('|');
  useEffect(() => { writeStoredSelection(key ? key.split('|') : []); }, [key]);
  return null;
}
