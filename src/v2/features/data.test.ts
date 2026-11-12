// "Data not available yet" detection for scorecard-be v2 (story S3/S4, FR-EXEC-020).
import { describe, expect, it } from 'vitest';
import { isSourcePending } from './data';

describe('SOURCE_PENDING', () => {
  it('TC-EXEC-016 a 503 SOURCE_PENDING answer is "not available yet", not an error', () => {
    expect(isSourcePending({ response: { status: 503, data: { code: 'SOURCE_PENDING' } } })).toBe(true);
  });

  it('TC-EXEC-016 any other failure is still an error', () => {
    expect(isSourcePending({ response: { status: 503, data: {} } })).toBe(false);
    expect(isSourcePending({ response: { status: 500, data: { code: 'SOURCE_PENDING' } } })).toBe(false);
    expect(isSourcePending(new Error('Network Error'))).toBe(false);
    expect(isSourcePending(null)).toBe(false);
  });
});
