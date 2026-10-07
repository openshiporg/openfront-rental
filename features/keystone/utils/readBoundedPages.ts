export async function readBoundedPages<T>(
  fetchPage: (skip: number, take: number) => Promise<T[]>,
  options: { pageSize: number; maxItems: number; label: string },
): Promise<T[]> {
  const { pageSize, maxItems, label } = options;
  if (!Number.isSafeInteger(pageSize) || pageSize < 1
    || !Number.isSafeInteger(maxItems) || maxItems < 1
    || !label.trim()) {
    throw new RangeError('Bounded pagination requires positive limits and a description.');
  }

  const items: T[] = [];
  let skip = 0;
  while (true) {
    const take = Math.min(pageSize, maxItems + 1 - items.length);
    const page = await fetchPage(skip, take);
    if (page.length > maxItems - items.length) {
      throw new Error(`${label} is incomplete because more than ${maxItems} records match. Narrow the request and retry.`);
    }
    items.push(...page);
    if (page.length < take) return items;
    skip += page.length;
  }
}
