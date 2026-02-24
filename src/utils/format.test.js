import { fmt, fmtDate, fmtShort, fmtTime } from './format';

describe('format guards invalid timestamps', () => {
  test('returns placeholder for non-finite timestamps', () => {
    expect(fmt(Infinity)).toBe('—');
    expect(fmtTime(Infinity)).toBe('—');
    expect(fmtDate(NaN)).toBe('—');
    expect(fmtShort(-Infinity)).toBe('—');
  });

  test('formats finite timestamps', () => {
    const ts = Date.parse('2024-01-15T08:30:00.000Z');
    expect(fmt(ts)).toBe('2024-01-15 10:30:00');
    expect(fmtTime(ts)).toBe('10:30:00');
    expect(fmtDate(ts)).toBe('2024-01-15');
    expect(fmtShort(ts)).toBe('01-15 10:30');
  });
});
