/**
 * Protected Route Component
 * 
 * Guards routes that require authentication. If the user is not authenticated,
 * they are redirected to /login. If authenticated, the protected component is rendered.
 */

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute wraps child components that require authentication.
 * 
 * Behavior:
 * - While checking auth state (loading): shows loading indicator
 * - If not authenticated: redirects to /login with current path as redirect
 * - If authenticated: renders the children
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
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

  // Not authenticated - redirect to login, preserving the intended destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated - show the protected content
  return <>{children}</>;
}
