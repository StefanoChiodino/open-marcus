/**
 * Test setup for vitest
 */

import '@testing-library/jest-dom';

// Mock scrollIntoView (not available in jsdom)
if (typeof window !== 'undefined') {
  Element.prototype.scrollIntoView = vi.fn();
}
