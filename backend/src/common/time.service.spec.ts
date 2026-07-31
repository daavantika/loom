import { TimeService } from './time.service';

describe('TimeService', () => {
  const svc = new TimeService();

  it('converts an IST date+time to the correct UTC instant (IST is UTC+5:30)', () => {
    const utc = svc.zonedDateTimeToUtc('2026-07-29', '20:00');
    // 20:00 IST == 14:30 UTC
    expect(utc.toISOString()).toBe('2026-07-29T14:30:00.000Z');
  });

  it('computes the correct IST weekday for a date near the UTC day boundary', () => {
    // 2026-07-29 is a Wednesday in IST.
    expect(svc.businessWeekday('2026-07-29')).toBe(3);
  });

  it('handles midnight-adjacent times without shifting the calendar date', () => {
    const utc = svc.zonedDateTimeToUtc('2026-01-01', '00:30');
    expect(utc.toISOString()).toBe('2025-12-31T19:00:00.000Z');
  });
});
