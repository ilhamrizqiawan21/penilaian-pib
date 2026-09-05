// null means the editor observed no row; undefined preserves legacy queued edits.
export function scoreHasConflict(base: string | null | undefined, current?: string) {
  return base !== undefined && base !== (current ?? null);
}
export function nextScoreVersion(previous?: string) {
  const prior = previous ? Date.parse(previous.endsWith('Z') ? previous : previous.replace(' ', 'T') + 'Z') : NaN;
  return new Date(Math.max(Date.now(), Number.isFinite(prior) ? prior + 1 : 0)).toISOString();
}
