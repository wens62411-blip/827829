const UTC_SHAPE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/;

/** Rejects JavaScript Date normalization of impossible calendar instants. */
export function isStrictUtcInstant(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = UTC_SHAPE.exec(value);
  if (match === null) return false;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return false;
  const canonical = `${match[1]}.${(match[2] ?? '').padEnd(3, '0')}Z`;
  return new Date(parsed).toISOString() === canonical;
}
