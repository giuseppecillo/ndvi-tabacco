/** Sort display options without mutating source data or changing their identities. */
export function alphabetical<T>(
  items: readonly T[],
  label: (item: T) => string,
  locale = "it-IT",
): T[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  return [...items].sort((a, b) => collator.compare(label(a), label(b)));
}
