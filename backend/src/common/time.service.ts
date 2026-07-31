import { Injectable } from '@nestjs/common';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export const BUSINESS_TIMEZONE = 'Asia/Kolkata';

/**
 * All cutoff/slot/settlement math must go through this service so business
 * time is always interpreted in Asia/Kolkata regardless of server timezone.
 */
@Injectable()
export class TimeService {
  now(): Date {
    return new Date();
  }

  toBusinessTime(utcDate: Date): Date {
    return toZonedTime(utcDate, BUSINESS_TIMEZONE);
  }

  /** Combine a calendar date (YYYY-MM-DD) and a HH:mm time-of-day, both interpreted in Asia/Kolkata, into a UTC instant. */
  zonedDateTimeToUtc(dateIso: string, timeHm: string): Date {
    return fromZonedTime(`${dateIso}T${timeHm}:00`, BUSINESS_TIMEZONE);
  }

  businessWeekday(dateIso: string): number {
    // 0 = Sunday .. 6 = Saturday, matching JS Date#getDay()
    const noonUtc = fromZonedTime(`${dateIso}T12:00:00`, BUSINESS_TIMEZONE);
    return this.toBusinessTime(noonUtc).getDay();
  }
}
