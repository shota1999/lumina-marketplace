import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('error-capture', () => {
  it('captures Error instances with name, message, stack', async () => {
    const { captureError } = await import('./error-capture');
    const { logger } = await import('@/lib/logger');

    captureError(new TypeError('test error'), { requestId: 'req-1' });

    expect(logger.error).toHaveBeenCalledWith(
      'Captured error',
      expect.objectContaining({
        error: expect.objectContaining({ name: 'TypeError', message: 'test error' }),
        requestId: 'req-1',
      }),
    );
  });

  it('captures non-Error values as strings', async () => {
    const { captureError } = await import('./error-capture');
    const { logger } = await import('@/lib/logger');

    captureError('string error', { route: '/test' });

    expect(logger.error).toHaveBeenCalledWith(
      'Captured error',
      expect.objectContaining({
        error: { message: 'string error' },
        route: '/test',
      }),
    );
  });

  it('captures business failures as warnings', async () => {
    const { captureBusinessFailure } = await import('./error-capture');
    const { logger } = await import('@/lib/logger');

    captureBusinessFailure('booking.create', 'UNAVAILABLE', { userId: 'u1' });

    expect(logger.warn).toHaveBeenCalledWith(
      'Business failure',
      expect.objectContaining({
        action: 'booking.create',
        failureCode: 'UNAVAILABLE',
        userId: 'u1',
      }),
    );
  });
});
