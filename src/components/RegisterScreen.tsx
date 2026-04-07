import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import PasswordGuidance from './PasswordGuidance';
import './RegisterScreen.css';

function RegisterScreen() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    if (error) {
      clearError();
    }
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await register(username, password);
      navigate('/');
    } catch {
      // Error is already set in the store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-screen">
      <div className="register-content">
        <div className="register-branding">
          <h1 className="register-title">OpenMarcus</h1>
          <p className="register-tagline">Your Stoic Mental Health Companion</p>
          <div className="register-divider" />
        </div>

        <div className="register-form-card">
          <h2 className="register-heading">Create Account</h2>

          {error && (
            <div className="register-error" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <form className="register-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="register-username" className="form-label">
                Username
              </label>
              <input
                id="register-username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                className="form-input"
                placeholder="Choose a username"
                autoFocus
                autoComplete="username"
                aria-required="true"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-password" className="form-label">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                className="form-input"
                placeholder="Choose a password"
                autoComplete="new-password"
                aria-required="true"
                disabled={isSubmitting}
              />
              <PasswordGuidance password={password} />
            </div>

            <button
              type="submit"
              className="button button--primary register-submit"
              disabled={isSubmitting || !username.trim() || !password.trim()}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="register-login-link">
            <span>Already have an account? </span>
            <Link to="/login">Sign in</Link>
          </div>
        </div>

        <div className="register-disclaimer" role="note">
          <strong>Note:</strong> OpenMarcus is not therapy or medical advice.
          It is a reflection tool based on Stoic philosophy.
        </div>
      </div>
    </div>
  );
}

export default RegisterScreen;
