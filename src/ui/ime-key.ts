/** Resolve an English card letter while an IME owns the text field.
 * The event's character wins; a layout map is only a fallback for Process keys.
 */
export function imeLatinKey(
  event: Pick<KeyboardEvent, "key" | "code">,
  layoutMap: ReadonlyMap<string, string> | null,
): string | null {
  if (/^[a-z]$/i.test(event.key)) return event.key;
  const mapped = layoutMap?.get(event.code);
  return mapped && /^[a-z]$/i.test(mapped) ? mapped : null;
}
