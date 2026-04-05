import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './pages/HomePage';
import OnboardingScreen from './components/OnboardingScreen';
import { useProfileStore } from './stores/profileStore';
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="app">
          <Routes>
            <Route path="/" element={<ProfileGateway />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
