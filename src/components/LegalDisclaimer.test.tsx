import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LegalDisclaimer from './LegalDisclaimer';

describe('LegalDisclaimer', () => {
  it('renders the disclaimer text', () => {
    render(<LegalDisclaimer />);

    expect(screen.getByText(/OpenMarcus is not therapy or medical advice/)).toBeInTheDocument();
    expect(screen.getByText(/reflection tool based on stoic philosophy/)).toBeInTheDocument();
  });

  it('has the Important label', () => {
    render(<LegalDisclaimer />);

    expect(screen.getByText('Important:')).toBeInTheDocument();
  });

  it('mentions crisis resources', () => {
    render(<LegalDisclaimer />);

    expect(screen.getByText(/crisis/)).toBeInTheDocument();
    expect(screen.getByText(/mental health professional/)).toBeInTheDocument();
    expect(screen.getByText(/emergency services/)).toBeInTheDocument();
  });

  it('has proper role attribute for accessibility', () => {
    render(<LegalDisclaimer />);

    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveAttribute('aria-label', 'Legal disclaimer');
  });

  it('has the expected CSS class for styling', () => {
    const { container } = render(<LegalDisclaimer />);

    const disclaimer = container.querySelector('.legal-disclaimer');
    expect(disclaimer).toBeInTheDocument();
  });

  it('renders the icon element', () => {
    const { container } = render(<LegalDisclaimer />);

    const icon = container.querySelector('.legal-disclaimer__icon');
    expect(icon).toBeInTheDocument();
  });
});
