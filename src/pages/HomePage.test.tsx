import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import HomePage from '../pages/HomePage';

describe('HomePage', () => {
  it('renders the welcome message', () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Welcome to OpenMarcus/)).toBeInTheDocument();
  });

  it('renders profile display when profile exists', () => {
    // Set up profile in store
    const mockProfile = {
      id: '1',
      name: 'Test User',
      bio: 'A stoic learner',
      encrypted_data: '',
      created_at: '2026-04-05T00:00:00Z',
      updated_at: '2026-04-05T00:00:00Z',
    };

    useProfileStore.setState({ profile: mockProfile, status: 'loaded' });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByTestId('profile-name')).toHaveTextContent('Welcome, Test User');
    expect(screen.getByTestId('profile-bio')).toHaveTextContent('A stoic learner');
  });
});
