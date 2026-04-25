import { describe, it, expect } from 'vitest';

import { stripHtml } from './sanitize';

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it('removes nested tags', () => {
    expect(stripHtml('<b><i>bold italic</i></b>')).toBe('bold italic');
  });

  it('preserves plain text', () => {
    expect(stripHtml('Great place to stay!')).toBe('Great place to stay!');
  });

  it('handles self-closing tags', () => {
    expect(stripHtml('line1<br/>line2')).toBe('line1line2');
  });

  it('handles img tags with attributes', () => {
    expect(stripHtml('<img src="x" onerror="alert(1)">')).toBe('');
  });
});
