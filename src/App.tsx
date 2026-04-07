import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './pages/HomePage';
import Settings from './pages/Settings';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import AppLayout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { useProfileStore } from './stores/profileStore';
import { useAuthStore } from './stores/authStore';
import { useTTSStore } from './stores/ttsSettingsStore';
import MeditationChat from './components/MeditationChat';
import SessionHistory from './components/SessionHistory';
import SessionDetail from './components/SessionDetail';
import ProfileForm from './components/ProfileForm';
import type { ProfileFormData } from './shared/types';
import './styles/App.css';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

/**
 * Auth Gateway - determines which screen to show based on authentication state
 * 
 * - If not authenticated: shows LoginScreen
 * - If authenticated: shows HomePage (which loads profile data)
 */
function AuthGateway() {
  const { isAuthenticated, isLoading: authLoading, loadToken } = useAuthStore();
  const { profile, status: profileStatus, loadProfile } = useProfileStore();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Load auth token on mount to check if user is already authenticated
    loadToken().finally(() => {
      setAuthChecked(true);
    });
  }, [loadToken]);

  useEffect(() => {
    // If authenticated, load the profile for this user
    if (isAuthenticated) {
      loadProfile();
    }
  }, [isAuthenticated, loadProfile]);

  // Loading state - haven't checked auth yet
  if (!authChecked || authLoading) {
    return (
      <div className="login-screen">
        <div className="login-content">
          <div className="login-branding">
            <h1 className="login-title">OpenMarcus</h1>
            <p className="login-tagline">Your Stoic Mental Health Companion</p>
          </div>
          <div className="loading-indicator">
            <span className="loading-spinner" aria-hidden="true" />
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - show login screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Authenticated but no profile exists yet - show profile creation
  if (profileStatus === 'not_found' || profileStatus === 'error') {
    return <OnboardingScreenWithAuth />;
  }

  // Authenticated with profile - show home page
  if (profileStatus === 'loaded' && profile) {
    return <HomePage />;
  }

  return null;
}

/**
 * OnboardingScreen variant that works with auth - creates profile for authenticated user
 */
function OnboardingScreenWithAuth() {
  const { saveProfile, error } = useProfileStore();

  const handleSubmit = (data: ProfileFormData) => {
    saveProfile(data);
  };

  return (
    <OnboardingScreenWrapper
      onSubmit={handleSubmit}
      isSubmitting={false}
      serverError={error}
    />
  );
}

// Wrapper to match the original OnboardingScreen interface
interface OnboardingScreenWrapperProps {
  onSubmit: (data: ProfileFormData) => void;
  isSubmitting: boolean;
  serverError: string | null;
}

function OnboardingScreenWrapper({ onSubmit, isSubmitting, serverError }: OnboardingScreenWrapperProps) {
  return (
    <div className="onboarding-screen">
      <div className="onboarding-content">
        <div className="onboarding-branding">
          <h1 className="onboarding-title">OpenMarcus</h1>
          <p className="onboarding-tagline">Your Stoic Mental Health Companion</p>
          <div className="onboarding-divider" />
        </div>

        <p className="onboarding-intro">
          Begin your journey of self-reflection and philosophical exploration,
          guided by the wisdom of Marcus Aurelius.
        </p>

        <div className="onboarding-form-card">
          <ProfileForm
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            serverError={serverError}
          />
        </div>

        <div className="disclaimer" role="note">
          <strong>Note:</strong> OpenMarcus is not therapy or medical advice.
          It is a reflection tool based on Stoic philosophy.
        </div>
      </div>
    </div>
  );
}

/**
 * Session History page - lists past sessions and allows viewing full session
 * Fulfills: VAL-MEDIT-006, VAL-MEDIT-007, VAL-MEDIT-008
 */

/**
 * Profile settings page with edit mode support
 */
function ProfilePage() {
  const { profile, isEditing, startEditing, cancelEditing, clearProfile, saveProfile } = useProfileStore();

  // When in edit mode, show the ProfileForm
  if (isEditing && profile) {
    return (
      <div className="page-container">
        <ProfileForm
          initialName={profile.name}
          initialBio={profile.bio || ''}
          onSubmit={saveProfile}
          onCancel={cancelEditing}
          isEditMode={true}
        />
      </div>
    );
  }

  // When not editing, show static profile display
  return (
    <div className="page-container">
      <h2>Profile Settings</h2>
      {profile && (
        <div className="profile-settings">
          <p><strong>Name:</strong> {profile.name}</p>
          {profile.bio && <p><strong>Bio:</strong> {profile.bio}</p>}
          <div className="profile-settings__actions">
            <button onClick={startEditing} className="button button--primary" aria-label="Edit your profile">
              Edit Profile
            </button>
            <button onClick={clearProfile} className="button button--secondary" aria-label="Reset your profile to default">
              Reset Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const fetchSettings = useTTSStore((state) => state.fetchSettings);

  // Fetch TTS settings on app load
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            {/* Auth routes - no layout needed */}
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/register" element={<RegisterScreen />} />

            {/* Routes with app layout (sidebar navigation, toasts) */}
            <Route element={<AppLayout />}>
              {/* Root path uses AuthGateway to check auth state */}
              <Route path="/" element={<AuthGateway />} />
              <Route path="/session" element={<MeditationChat />} />
              <Route path="/history" element={<SessionHistory />} />
              <Route path="/history/:sessionId" element={<SessionDetail />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
