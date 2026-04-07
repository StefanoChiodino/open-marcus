/**
 * Guest Route Component
 * 
 * Guards routes that should only be accessible to unauthenticated users.
 * If the user IS authenticated, they are redirected away (e.g., to home).
 * 
 * Use case: /login and /register should not be accessible to already logged-in users.
 */

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface GuestRouteProps {
  children: React.ReactNode;
}

/**
 * GuestRoute wraps child components that should only be accessible to guests.
 * 
 * Behavior:
 * - While checking auth state (loading): shows loading indicator
 * - If authenticated: redirects to home or specified destination
 * - If not authenticated: renders the children (login/register page)
 */
export function GuestRoute({ children }: GuestRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading, loadToken } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Load auth token on mount to check if user is already authenticated
    loadToken().finally(() => {
      setAuthChecked(true);
    });
  }, [loadToken]);

  // Still checking auth state - show loading
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

  // Authenticated - redirect to home, or the page they were trying to access
  // Use state.redirect if available (from ProtectedRoute), otherwise go to /
  const redirectTo = location.state?.from?.pathname || '/';
  
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Not authenticated - show the guest content (login/register page)
  return <>{children}</>;
}
