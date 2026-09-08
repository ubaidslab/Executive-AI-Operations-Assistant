const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Resolves "today" / "tomorrow" / an explicit YYYY-MM-DD into YYYY-MM-DD,
 * relative to `today`. Throws on anything else — the caller should surface
 * that as a clear tool error rather than silently guessing a date. */
export function resolveDateKeyword(input: string, today: string): string {
  const normalized = input.trim().toLowerCase();

  if (normalized === "today") return today;

  if (normalized === "tomorrow") {
    const d = new Date(`${today}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  if (normalized === "yesterday") {
    const d = new Date(`${today}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  if (DATE_RE.test(input) && !Number.isNaN(Date.parse(input))) {
    return input;
  }

  throw new Error(`Could not resolve "${input}" as a date — use "today", "tomorrow", or YYYY-MM-DD.`);
}

/** Preserves an event's original duration when it's moved to a new start time. */
export function computeRescheduledEnd(start: string, end: string, newStart: string): string {
  const durationMs = new Date(end).getTime() - new Date(start).getTime();
  return new Date(new Date(newStart).getTime() + durationMs).toISOString();
}
