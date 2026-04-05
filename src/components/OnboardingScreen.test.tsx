import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import OnboardingScreen from './OnboardingScreen';

describe('OnboardingScreen', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    isSubmitting: false,
    serverError: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the OpenMarcus branding', () => {
    render(<OnboardingScreen {...defaultProps} />);

    expect(screen.getByText('OpenMarcus')).toBeInTheDocument();
    expect(screen.getByText('Your Stoic Mental Health Companion')).toBeInTheDocument();
  });

  it('renders the intro text', () => {
    render(<OnboardingScreen {...defaultProps} />);

    expect(screen.getByText(/Begin your journey of self-reflection/)).toBeInTheDocument();
  });

  it('renders the ProfileForm component', () => {
    render(<OnboardingScreen {...defaultProps} />);

    expect(screen.getByText('Tell Us About Yourself')).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
  });

  it('renders the disclaimer', () => {
    render(<OnboardingScreen {...defaultProps} />);

    expect(screen.getByText(/OpenMarcus is not therapy/)).toBeInTheDocument();
  });

  it('passes through server errors', () => {
    render(<OnboardingScreen {...defaultProps} serverError="Something went wrong" />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('passes through isSubmitting state', () => {
    render(<OnboardingScreen {...defaultProps} isSubmitting />);

    const submitButton = screen.getByRole('button', { name: 'Creating...' });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute('aria-busy', 'true');
  });
});
