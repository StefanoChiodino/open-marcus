/**
 * Tests for AuthGateway component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
import { AuthGateway } from './AuthGateway';

// Mock the child components
vi.mock('./LoginScreen', () => ({
  default: () => <div data-testid="login-screen">Login Screen</div>,
}));

vi.mock('../pages/HomePage', () => ({
  default: () => <div data-testid="home-page">Home Page</div>,
}));

vi.mock('./ProfileForm', () => ({
  default: ({ isEditMode, onSubmit, onCancel }: {
    isEditMode: boolean;
    onSubmit: () => void;
    onCancel?: () => void;
  }) => (
    <div data-testid="profile-form" data-edit-mode={isEditMode}>
      <span>Profile Form {isEditMode ? '(Edit Mode)' : '(Create Mode)'}</span>
      <button onClick={onSubmit} data-testid="form-submit">Submit</button>
      {onCancel && <button onClick={onCancel} data-testid="form-cancel">Cancel</button>}
    </div>
  ),
}));

describe('AuthGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset stores to initial state
    useAuthStore.setState({
      isAuthenticated: false,
      currentUser: null,
      authToken: null,
      isLoading: false,
      error: null,
    });
    useProfileStore.setState({
      profile: null,
      status: 'loading',
      error: null,
      isEditing: false,
    });
  });

  const renderAuthGateway = async () => {
    let renderResult: ReturnType<typeof render>;
    await act(async () => {
      renderResult = render(
        <BrowserRouter>
          <AuthGateway />
        </BrowserRouter>
      );
    });
    return renderResult!;
  };

  describe('when isAuthenticated=false', () => {
    it('shows LoginScreen', async () => {
      // Mock loadToken to prevent the useEffect from running
      const loadTokenMock = vi.fn().mockResolvedValue(undefined);
      useAuthStore.setState({ 
        isAuthenticated: false,
        isLoading: false,
        loadToken: loadTokenMock,
      });

      await renderAuthGateway();

      expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    });
  });

  describe('when isAuthenticated=true and profileStatus="loading"', () => {
    it('shows loading state', async () => {
      const loadTokenMock = vi.fn().mockResolvedValue(undefined);
      const loadProfileMock = vi.fn().mockResolvedValue(undefined); // Mock to prevent actual API call
      useAuthStore.setState({
        isAuthenticated: true,
        currentUser: { id: 'user-1', username: 'testuser' },
        authToken: 'valid-token',
        isLoading: false,
        loadToken: loadTokenMock,
      });
      useProfileStore.setState({ 
        status: 'loading',
        loadProfile: loadProfileMock,
      });

      await renderAuthGateway();

      expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    });
  });

  describe('when isAuthenticated=true and profileStatus="not_found"', () => {
    it('shows onboarding (ProfileForm with isEditMode=false)', async () => {
      const loadTokenMock = vi.fn().mockResolvedValue(undefined);
      const loadProfileMock = vi.fn().mockResolvedValue(undefined);
      useAuthStore.setState({
        isAuthenticated: true,
        currentUser: { id: 'user-1', username: 'testuser' },
        authToken: 'valid-token',
        isLoading: false,
        loadToken: loadTokenMock,
      });
      useProfileStore.setState({ 
        status: 'not_found', 
        profile: null,
        loadProfile: loadProfileMock,
      });

      await renderAuthGateway();

      expect(screen.getByTestId('profile-form')).toBeInTheDocument();
      expect(screen.getByTestId('profile-form')).toHaveAttribute('data-edit-mode', 'false');
    });
  });

  describe('when isAuthenticated=true and profile is loaded', () => {
    it('shows HomePage', async () => {
      const mockProfile = {
        id: 'profile-1',
        name: 'Test User',
        bio: 'Test bio',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      const loadTokenMock = vi.fn().mockResolvedValue(undefined);
      const loadProfileMock = vi.fn().mockResolvedValue(undefined);
      useAuthStore.setState({
        isAuthenticated: true,
        currentUser: { id: 'user-1', username: 'testuser' },
        authToken: 'valid-token',
        isLoading: false,
        loadToken: loadTokenMock,
      });
      useProfileStore.setState({ 
        status: 'loaded', 
        profile: mockProfile,
        loadProfile: loadProfileMock,
      });

      await renderAuthGateway();

      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });
  });

  describe('loadProfile is called when isAuthenticated becomes true', () => {
    it('calls loadProfile when isAuthenticated changes to true', async () => {
      const loadProfileMock = vi.fn().mockResolvedValue(undefined);
      const loadTokenMock = vi.fn().mockResolvedValue(undefined);

      // First set authenticated to false
      useAuthStore.setState({ 
        isAuthenticated: false,
        isLoading: false,
        loadToken: loadTokenMock,
      });
      useProfileStore.setState({ 
        status: 'not_found', 
        profile: null,
        loadProfile: loadProfileMock,
      });

      await renderAuthGateway();

      // Verify LoginScreen is shown when not authenticated
      expect(screen.getByTestId('login-screen')).toBeInTheDocument();

      // Now set authenticated to true
      useAuthStore.setState({
        isAuthenticated: true,
        currentUser: { id: 'user-1', username: 'testuser' },
        authToken: 'valid-token',
        isLoading: false,
        loadToken: loadTokenMock,
      });

      // Wait for the effect to call loadProfile
      await waitFor(() => {
        expect(loadProfileMock).toHaveBeenCalled();
      });
    });
  });

  describe('initial auth check', () => {
    it('shows loading state while auth is being checked', async () => {
      const loadTokenMock = vi.fn().mockResolvedValue(undefined);
      // Set loading state to simulate auth check in progress
      useAuthStore.setState({ isLoading: true, loadToken: loadTokenMock });

      await renderAuthGateway();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});
