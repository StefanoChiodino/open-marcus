/**
 * Test setup for vitest
 */

import '@testing-library/jest-dom';
import { beforeAll } from 'vitest';

// Mock scrollIntoView (not available in jsdom)
if (typeof window !== 'undefined') {
  Element.prototype.scrollIntoView = vi.fn();
}

// Suppress React Router v7 future flag warnings in tests
// These warnings are expected when testing with React Router v6
// The v7 flags are enabled in App.tsx for production
beforeAll(() => {
  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    // Filter out React Router v7 future flag warnings
    if (typeof args[0] === 'string' && args[0].includes('React Router Future Flag')) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
});