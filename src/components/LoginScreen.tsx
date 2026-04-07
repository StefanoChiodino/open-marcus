import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import './LoginScreen.css';

interface LoginScreenProps {
  // Optional: if provided, will navigate to this URL after successful login
  redirectTo?: string;
}

function LoginScreen({ redirectTo }: LoginScreenProps) {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    // Clear error when user changes input
    if (error) {
      clearError();
    }
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    // Clear error when user changes input
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!username.trim() || !password.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login(username, password);
      // Navigate to home or specified redirect
      navigate(redirectTo || '/');
    } catch {
      // Error is already set in the store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-content">
        <div className="login-branding">
          <h1 className="login-title">OpenMarcus</h1>
          <p className="login-tagline">Your Stoic Mental Health Companion</p>
          <div className="login-divider" />
        </div>

        <div className="login-form-card">
          <h2 className="login-heading">Welcome Back</h2>

          {error && (
            <div className="login-error" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="login-username" className="form-label">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                className="form-input"
                placeholder="Enter your username"
                autoFocus
                autoComplete="username"
                aria-required="true"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                className="form-input"
                placeholder="Enter your password"
                autoComplete="current-password"
                aria-required="true"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              className="button button--primary login-submit"
              disabled={isSubmitting || !username.trim() || !password.trim()}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="login-register-link">
            <span>New to OpenMarcus? </span>
            <Link to="/register">Create an account</Link>
          </div>
        </div>

        <div className="login-disclaimer" role="note">
          <strong>Note:</strong> OpenMarcus is not therapy or medical advice.
          It is a reflection tool based on Stoic philosophy.
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
