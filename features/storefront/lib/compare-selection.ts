/**
 * The guest's comparison choices: up to three public home slugs. The compare page's URL is
 * the authority; this tab's session storage mirrors it so results pages show the same
 * choices (after removing a home, clearing, or going back and forward). Nothing here is ever
 * read by the server.
 */
export const COMPARE_LIMIT = 3;
const COMPARE_KEY = 'stay-compare-homes';

export function normalizeSelection(slugs: unknown): string[] {
  if (!Array.isArray(slugs)) return [];
  return [...new Set(slugs.filter((slug): slug is string => typeof slug === 'string' && /^[a-z0-9-]{1,200}$/i.test(slug)))].slice(0, COMPARE_LIMIT);
}

/** The stored choices, or null when this browser isn't storing them. */
export function readStoredSelection(): string[] | null {
  try {
    return normalizeSelection(JSON.parse(window.sessionStorage.getItem(COMPARE_KEY) || '[]'));
  } catch {
    return null;
  }
}

/** Saves the choices; false when this browser isn't storing them. */
export function writeStoredSelection(slugs: string[]) {
  try {
    if (slugs.length) window.sessionStorage.setItem(COMPARE_KEY, JSON.stringify(normalizeSelection(slugs)));
    else window.sessionStorage.removeItem(COMPARE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** The choices carried in this page's URL (`home` parameters). */
export function urlSelection(): string[] {
  try {
    return normalizeSelection(new URL(window.location.href).searchParams.getAll('home'));
  } catch {
    return [];
  }
}

/** Mirrors the choices into this page's URL, so a refresh keeps them even without storage. */
export function writeUrlSelection(slugs: string[]) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('home');
    for (const slug of normalizeSelection(slugs)) url.searchParams.append('home', slug);
    window.history.replaceState(window.history.state, '', url);
  } catch { /* history unavailable */ }
}
