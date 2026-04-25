import { describe, it, expect } from 'vitest';

import {
  validateBookingDates,
  calculateNights,
  calculateTotalPrice,
  datesOverlap,
} from './booking-validation';

describe('validateBookingDates', () => {
  const now = new Date('2025-06-01T00:00:00Z');

  it('returns null for valid future dates', () => {
    expect(
      validateBookingDates({ startDate: '2025-06-10', endDate: '2025-06-15', now }),
    ).toBeNull();
  });

  it('rejects when check-out is before check-in', () => {
    const result = validateBookingDates({ startDate: '2025-06-15', endDate: '2025-06-10', now });
    expect(result).toEqual({ code: 'INVALID_DATES', message: 'Check-out must be after check-in' });
  });

  it('rejects same-day check-in and check-out', () => {
    const result = validateBookingDates({ startDate: '2025-06-10', endDate: '2025-06-10', now });
    expect(result?.code).toBe('INVALID_DATES');
  });

  it('rejects past check-in dates', () => {
    const result = validateBookingDates({ startDate: '2025-05-01', endDate: '2025-05-05', now });
    expect(result).toEqual({ code: 'PAST_DATE', message: 'Check-in date cannot be in the past' });
  });

  it('rejects stays longer than 365 nights', () => {
    const result = validateBookingDates({ startDate: '2025-06-10', endDate: '2027-06-10', now });
    expect(result?.code).toBe('TOO_LONG');
  });

  it('allows exactly 365 nights', () => {
    expect(
      validateBookingDates({ startDate: '2025-06-10', endDate: '2026-06-10', now }),
    ).toBeNull();
  });

  it('rejects invalid date strings', () => {
    const result = validateBookingDates({ startDate: 'not-a-date', endDate: '2025-06-10', now });
    expect(result?.code).toBe('INVALID_DATES');
  });
});

describe('calculateNights', () => {
  it('calculates correct number of nights', () => {
    expect(calculateNights('2025-06-10', '2025-06-15')).toBe(5);
  });

  it('returns 1 for consecutive days', () => {
    expect(calculateNights('2025-06-10', '2025-06-11')).toBe(1);
  });
});

describe('calculateTotalPrice', () => {
  it('multiplies price by nights', () => {
    expect(calculateTotalPrice(200, 5)).toBe(1000);
  });

  it('returns 0 for 0 nights', () => {
    expect(calculateTotalPrice(200, 0)).toBe(0);
  });
});

describe('datesOverlap', () => {
  it('detects fully overlapping ranges', () => {
    expect(
      datesOverlap({
        existingStart: '2025-06-10',
        existingEnd: '2025-06-15',
        newStart: '2025-06-12',
        newEnd: '2025-06-14',
      }),
    ).toBe(true);
  });

  it('detects partial overlap (new starts during existing)', () => {
    expect(
      datesOverlap({
        existingStart: '2025-06-10',
        existingEnd: '2025-06-15',
        newStart: '2025-06-13',
        newEnd: '2025-06-20',
      }),
    ).toBe(true);
  });

  it('detects partial overlap (new ends during existing)', () => {
    expect(
      datesOverlap({
        existingStart: '2025-06-10',
        existingEnd: '2025-06-15',
        newStart: '2025-06-05',
        newEnd: '2025-06-12',
      }),
    ).toBe(true);
  });

  it('detects when new fully contains existing', () => {
    expect(
      datesOverlap({
        existingStart: '2025-06-12',
        existingEnd: '2025-06-14',
        newStart: '2025-06-10',
        newEnd: '2025-06-20',
      }),
    ).toBe(true);
  });

  it('returns false for non-overlapping (new after existing)', () => {
    expect(
      datesOverlap({
        existingStart: '2025-06-10',
        existingEnd: '2025-06-15',
        newStart: '2025-06-16',
        newEnd: '2025-06-20',
      }),
    ).toBe(false);
  });

  it('returns false for non-overlapping (new before existing)', () => {
    expect(
      datesOverlap({
        existingStart: '2025-06-10',
        existingEnd: '2025-06-15',
        newStart: '2025-06-01',
        newEnd: '2025-06-09',
      }),
    ).toBe(false);
  });

  it('returns false for adjacent ranges (checkout = checkin)', () => {
    expect(
      datesOverlap({
        existingStart: '2025-06-10',
        existingEnd: '2025-06-15',
        newStart: '2025-06-15',
        newEnd: '2025-06-20',
      }),
    ).toBe(false);
  });
});
