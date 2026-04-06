import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import SkipLink from './SkipLink';

describe('SkipLink', () => {
  beforeEach(() => {
    // Create a mock main content element for the skip link to target
    document.body.innerHTML = '<main id="main-content">Main Content</main>';
  });

  it('renders the skip link with default label', () => {
    render(<SkipLink target="#main-content" />);

    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<SkipLink target="#main-content" label="Jump to content" />);

    const skipLink = screen.getByRole('link', { name: /jump to content/i });
    expect(skipLink).toBeInTheDocument();
  });

  it('links to the correct target', () => {
    render(<SkipLink target="#main-content" />);

    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('has skip-link class for CSS styling', () => {
    render(<SkipLink target="#main-content" />);

    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toHaveClass('skip-link');
  });

  it('is always present in the DOM for keyboard users', () => {
    render(<SkipLink target="#main-content" />);

    // Skip link should always be in the DOM (CSS hides it visually, not DOM)
    const skipLink = screen.queryByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeTruthy();
  });
});
