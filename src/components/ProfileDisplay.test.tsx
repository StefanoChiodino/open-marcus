import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfileDisplay from './ProfileDisplay';

describe('ProfileDisplay', () => {
  const mockProfile = {
    id: '1',
    name: 'Marcus',
    bio: 'A stoic philosopher from Rome',
    encrypted_data: '',
    created_at: '2026-04-05T00:00:00Z',
    updated_at: '2026-04-05T00:00:00Z',
  };

  it('renders the profile name', () => {
    render(<ProfileDisplay profile={mockProfile} onEdit={vi.fn()} />);

    expect(screen.getByTestId('profile-name')).toHaveTextContent('Welcome, Marcus');
  });

  it('renders the profile bio when available', () => {
    render(<ProfileDisplay profile={mockProfile} onEdit={vi.fn()} />);

    expect(screen.getByTestId('profile-bio')).toHaveTextContent('A stoic philosopher from Rome');
  });

  it('does not render bio element when bio is null', () => {
    const profileWithoutBio = { ...mockProfile, bio: null };
    render(<ProfileDisplay profile={profileWithoutBio} onEdit={vi.fn()} />);

    expect(screen.queryByTestId('profile-bio')).not.toBeInTheDocument();
  });

  it('renders the container div', () => {
    render(<ProfileDisplay profile={mockProfile} onEdit={vi.fn()} />);

    expect(screen.getByTestId('profile-display')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<ProfileDisplay profile={mockProfile} onEdit={onEdit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
