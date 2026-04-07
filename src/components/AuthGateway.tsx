/**
 * Auth Gateway Component
 * Determines which screen to show based on authentication state
 * 
 * - If not authenticated: shows LoginScreen
 * - If authenticated: shows HomePage
 * 
 * Profile creation is part of registration - shows onboarding form if no profile exists.
 */

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
import LoginScreen from './LoginScreen';
import HomePage from '../pages/HomePage';
import ProfileForm from './ProfileForm';

export function AuthGateway() {
  const { isAuthenticated, isLoading: authLoading, loadToken } = useAuthStore();
  const { profile, status: profileStatus, loadProfile, saveProfile } = useProfileStore();
  const [authChecked, setAuthChecked] = useState(false);
  
  // Use a ref to track if we've already initiated profile loading for this auth session
  const profileLoadInitiated = useRef(false);

  useEffect(() => {
    // Load auth token on mount to check if user is already authenticated
    loadToken().finally(() => {
      setAuthChecked(true);
    });
  }, [loadToken]);

  useEffect(() => {
    // If authenticated and we haven't already initiated a profile load, load the profile.
    // This handles the case where the component re-renders after auth is confirmed
    // but the profile hasn't been loaded yet (e.g., after navigating between protected routes).
    if (isAuthenticated && !profileLoadInitiated.current) {
      profileLoadInitiated.current = true;
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

  // Authenticated but profile still loading - show loading state
  if (profileStatus === 'loading') {
    return (
      <div className="login-screen">
        <div className="login-content">
          <div className="login-branding">
            <h1 className="login-title">OpenMarcus</h1>
            <p className="login-tagline">Your Stoic Mental Health Companion</p>
          </div>
          <div className="loading-indicator">
            <span className="loading-spinner" aria-hidden="true" />
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated but no profile - show onboarding form
  if (profileStatus === 'not_found' || !profile) {
    return (
      <div className="page-container">
        <ProfileForm
          initialName=""
          initialBio=""
          onSubmit={saveProfile}
          isEditMode={false}
        />
      </div>
    );
  }

  // Authenticated and profile loaded - show home page
  return <HomePage />;
}

export default AuthGateway;
