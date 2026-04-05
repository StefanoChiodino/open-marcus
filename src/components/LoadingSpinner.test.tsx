import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default medium size', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('renders with custom label', () => {
    render(<LoadingSpinner label="Fetching your meditation..." />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Fetching your meditation...');
    expect(screen.getByText('Fetching your meditation...')).toBeInTheDocument();
  });

  it('renders small size class when size is "sm"', () => {
    render(<LoadingSpinner size="sm" />);
    const spinnerElement = document.querySelector('.loading-spinner--sm');
    expect(spinnerElement).toBeInTheDocument();
  });

  it('renders large size class when size is "lg"', () => {
    render(<LoadingSpinner size="lg" />);
    const spinnerElement = document.querySelector('.loading-spinner--lg');
    expect(spinnerElement).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="my-custom-class" />);
    const container = screen.getByRole('status');
    expect(container).toHaveClass('my-custom-class');
  });
});
