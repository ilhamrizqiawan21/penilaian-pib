import {describe,expect,it,vi,afterEach} from 'vitest';
import {nextScoreVersion,scoreHasConflict} from './score-version';
describe('score concurrency',()=>{
  afterEach(()=>vi.useRealTimers());
  it('detects concurrent creation, edits, and deletion',()=>{
    expect(scoreHasConflict(null,'2026-09-05 10:00:00')).toBe(true);
    expect(scoreHasConflict('old','new')).toBe(true);
    expect(scoreHasConflict('old',undefined)).toBe(true);
    expect(scoreHasConflict(null,undefined)).toBe(false);
    expect(scoreHasConflict('same','same')).toBe(false);
    expect(scoreHasConflict(undefined,'legacy')).toBe(false);
  });
  it('issues distinct versions for rapid writes and a backward clock',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-05T10:00:00Z'));
    const first=nextScoreVersion('2026-09-05 10:00:00');
    const second=nextScoreVersion(first);
    expect(Date.parse(second)).toBeGreaterThan(Date.parse(first));
    vi.setSystemTime(new Date('2026-09-04T10:00:00Z'));
    expect(Date.parse(nextScoreVersion(second))).toBeGreaterThan(Date.parse(second));
  });
});
