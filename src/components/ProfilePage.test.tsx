/**
 * Tests for ProfilePage component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import { ProfilePage } from './ProfilePage';

// Mock ProfileForm component
vi.mock('./ProfileForm', () => ({
  default: ({ initialName, initialBio, onSubmit, onCancel, isEditMode }: {
    initialName: string;
    initialBio: string;
    onSubmit: () => void;
    onCancel?: () => void;
    isEditMode: boolean;
  }) => (
    <div data-testid="profile-form" data-edit-mode={isEditMode}>
      <span>Profile Form - Name: {initialName}, Bio: {initialBio}</span>
      <button onClick={onSubmit} data-testid="form-save">Save</button>
      {onCancel && <button onClick={onCancel} data-testid="form-cancel">Cancel</button>}
    </div>
  ),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useProfileStore.setState({
      profile: null,
      status: 'loading',
      error: null,
      isEditing: false,
    });
  });

  const renderProfilePage = () => {
    return render(
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    );
  };

  describe('when profile is loaded', () => {
    const mockProfile = {
      id: 'profile-1',
      name: 'Test User',
      bio: 'A test bio',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    beforeEach(() => {
      useProfileStore.setState({ profile: mockProfile, status: 'loaded' });
    });

    it('shows name and bio', () => {
      renderProfilePage();

      expect(screen.getByText(/Test User/)).toBeInTheDocument();
      expect(screen.getByText(/A test bio/)).toBeInTheDocument();
    });

    it('shows Edit Profile button', () => {
      renderProfilePage();

      expect(screen.getByRole('button', { name: /Edit your profile/i })).toBeInTheDocument();
    });

    it('does NOT show Reset Profile button', () => {
      renderProfilePage();

      expect(screen.queryByRole('button', { name: /Reset/i })).not.toBeInTheDocument();
    });

    it('shows static profile display (not form)', () => {
      renderProfilePage();

      expect(screen.queryByTestId('profile-form')).not.toBeInTheDocument();
      expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    });
  });

  describe('when profile is null', () => {
    beforeEach(() => {
      useProfileStore.setState({ profile: null, status: 'not_found' });
    });

    it('shows only the heading "Profile Settings"', () => {
      renderProfilePage();

      expect(screen.getByText('Profile Settings')).toBeInTheDocument();
      // Should not show name or bio since profile is null
      expect(screen.queryByText(/Name:/)).not.toBeInTheDocument();
    });

    it('does not show Edit Profile button', () => {
      renderProfilePage();

      expect(screen.queryByRole('button', { name: /Edit your profile/i })).not.toBeInTheDocument();
    });
  });

  describe('when isEditing=true and profile exists', () => {
    const mockProfile = {
      id: 'profile-1',
      name: 'Test User',
      bio: 'A test bio',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('shows ProfileForm in edit mode', () => {
      useProfileStore.setState({ profile: mockProfile, status: 'loaded', isEditing: true });

      renderProfilePage();

      expect(screen.getByTestId('profile-form')).toBeInTheDocument();
      expect(screen.getByTestId('profile-form')).toHaveAttribute('data-edit-mode', 'true');
    });

    it('pre-fills form with profile data', () => {
      useProfileStore.setState({ profile: mockProfile, status: 'loaded', isEditing: true });

      renderProfilePage();

      expect(screen.getByText(/Name: Test User/)).toBeInTheDocument();
      expect(screen.getByText(/Bio: A test bio/)).toBeInTheDocument();
    });
  });

  describe('when isEditing=false and profile exists', () => {
    const mockProfile = {
      id: 'profile-1',
      name: 'Test User',
      bio: 'A test bio',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('shows static profile display', () => {
      useProfileStore.setState({ profile: mockProfile, status: 'loaded', isEditing: false });

      renderProfilePage();

      expect(screen.queryByTestId('profile-form')).not.toBeInTheDocument();
      expect(screen.getByText(/Profile Settings/)).toBeInTheDocument();
    });
  });

  describe('Edit Profile button behavior', () => {
    const mockProfile = {
      id: 'profile-1',
      name: 'Test User',
      bio: 'A test bio',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('calls startEditing when Edit Profile button is clicked', () => {
      const startEditingMock = vi.fn();
      useProfileStore.setState({ 
        profile: mockProfile, 
        status: 'loaded', 
        isEditing: false,
        startEditing: startEditingMock,
      });

      renderProfilePage();

      fireEvent.click(screen.getByRole('button', { name: /Edit your profile/i }));

      expect(startEditingMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form behavior in edit mode', () => {
    const mockProfile = {
      id: 'profile-1',
      name: 'Test User',
      bio: 'A test bio',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('calls cancelEditing when Cancel is clicked', () => {
      const cancelEditingMock = vi.fn();
      useProfileStore.setState({ 
        profile: mockProfile, 
        status: 'loaded', 
        isEditing: true,
        cancelEditing: cancelEditingMock,
      });

      renderProfilePage();

      fireEvent.click(screen.getByTestId('form-cancel'));

      expect(cancelEditingMock).toHaveBeenCalledTimes(1);
    });

    it('calls saveProfile when Save is clicked', () => {
      const saveProfileMock = vi.fn();
      useProfileStore.setState({ 
        profile: mockProfile, 
        status: 'loaded', 
        isEditing: true,
        saveProfile: saveProfileMock,
      });

      renderProfilePage();

      fireEvent.click(screen.getByTestId('form-save'));

      expect(saveProfileMock).toHaveBeenCalledTimes(1);
    });
  });
});
