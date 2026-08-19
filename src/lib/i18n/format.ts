/** Fills {placeholders} in a dictionary string. Interpolated values are inserted verbatim. */
export function t(template: string, values?: Record<string, string | number>) {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  );
}

/** Picks the singular or plural form and exposes the count as {count}. */
export function plural(
  count: number,
  forms: { one: string; other: string },
  values?: Record<string, string | number>
) {
  return t(count === 1 ? forms.one : forms.other, { count, ...values });
}
