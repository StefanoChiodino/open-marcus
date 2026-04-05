import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './pages/HomePage';
import Settings from './pages/Settings';
import OnboardingScreen from './components/OnboardingScreen';
import AppLayout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { useProfileStore } from './stores/profileStore';
import MeditationChat from './components/MeditationChat';
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

function ProfileGateway() {
  const { profile, status, error, loadProfile, saveProfile } = useProfileStore();

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSubmit = (data: ProfileFormData) => {
    saveProfile(data);
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="onboarding-screen">
        <div className="onboarding-content">
          <div className="onboarding-branding">
            <h1 className="onboarding-title">OpenMarcus</h1>
            <p className="onboarding-tagline">Your Stoic Mental Health Companion</p>
          </div>
          <div className="loading-indicator">
            <span className="loading-spinner" aria-hidden="true" />
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show onboarding screen if no profile exists
  if (status === 'not_found' || status === 'error') {
    return (
      <OnboardingScreen
        onSubmit={handleSubmit}
        isSubmitting={false}
        serverError={error}
      />
    );
  }

  // Profile loaded, show homepage
  if (status === 'loaded' && profile) {
    return <HomePage />;
  }

  return null;
}

/**
 * Placeholder history page - to be implemented by session-history-ui feature
 */
function HistoryPage() {
  return (
    <div className="page-container">
      <h2>Session History</h2>
      <p className="text-muted">No meditations yet. Begin your first meditation.</p>
    </div>
  );
}

/**
 * Placeholder profile settings page
 */
function ProfilePage() {
  const { profile, startEditing, clearProfile } = useProfileStore();

  return (
    <div className="page-container">
      <h2>Profile Settings</h2>
      {profile && (
        <div className="profile-settings">
          <p><strong>Name:</strong> {profile.name}</p>
          {profile.bio && <p><strong>Bio:</strong> {profile.bio}</p>}
          <div className="profile-settings__actions">
            <button onClick={startEditing} className="button button--primary">
              Edit Profile
            </button>
            <button onClick={clearProfile} className="button button--secondary">
              Reset Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            {/* Route without layout for onboarding */}
            <Route path="/onboarding" element={<ProfileGateway />} />

            {/* Routes with app layout (sidebar navigation, toasts) */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<ProfileGateway />} />
              <Route path="/session" element={<MeditationChat />} />
              <Route path="/history" element={<HistoryPage />} />
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
