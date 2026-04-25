/**
 * Pure booking validation logic — no DB dependencies, fully testable.
 */

interface DateValidationInput {
  startDate: string;
  endDate: string;
  now?: Date; // injectable for testing
}

interface ValidationError {
  code: string;
  message: string;
}

export function validateBookingDates(input: DateValidationInput): ValidationError | null {
  const { startDate, endDate, now = new Date() } = input;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { code: 'INVALID_DATES', message: 'Invalid date format' };
  }

  if (start >= end) {
    return { code: 'INVALID_DATES', message: 'Check-out must be after check-in' };
  }

  if (start < today) {
    return { code: 'PAST_DATE', message: 'Check-in date cannot be in the past' };
  }

  const nights = calculateNights(startDate, endDate);
  if (nights > 365) {
    return { code: 'TOO_LONG', message: 'Maximum stay is 365 nights' };
  }

  return null;
}

export function calculateNights(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function calculateTotalPrice(pricePerNight: number, nights: number): number {
  return nights * pricePerNight;
}

interface OverlapInput {
  existingStart: string;
  existingEnd: string;
  newStart: string;
  newEnd: string;
}

/**
 * Check if two date ranges overlap.
 * Overlap: existing.start < new.end AND existing.end > new.start
 */
export function datesOverlap(input: OverlapInput): boolean {
  return input.existingStart < input.newEnd && input.existingEnd > input.newStart;
}
