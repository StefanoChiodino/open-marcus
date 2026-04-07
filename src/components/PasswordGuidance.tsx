import './PasswordGuidance.css';

interface PasswordGuidanceProps {
  password: string;
}

/**
 * Password strength criteria:
 * - At least 8 characters
 * - Contains uppercase letter
 * - Contains lowercase letter
 * - Contains number
 * - Contains special character
 */
function checkPasswordCriteria(password: string) {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
}

function PasswordGuidance({ password }: PasswordGuidanceProps) {
  const criteria = checkPasswordCriteria(password);

  // Don't show anything if password is empty
  if (!password) {
    return null;
  }

  const allMet = Object.values(criteria).every(Boolean);

  return (
    <div className="password-guidance" aria-live="polite">
      <p className="password-guidance__title">Password strength:</p>
      <ul className="password-guidance__list">
        <li className={`password-guidance__item ${criteria.minLength ? 'met' : ''}`}>
          <span className="password-guidance__check" aria-hidden="true">
            {criteria.minLength ? '✓' : '○'}
          </span>
          <span>8+ characters</span>
        </li>
        <li className={`password-guidance__item ${criteria.hasUppercase ? 'met' : ''}`}>
          <span className="password-guidance__check" aria-hidden="true">
            {criteria.hasUppercase ? '✓' : '○'}
          </span>
          <span>Uppercase letter</span>
        </li>
        <li className={`password-guidance__item ${criteria.hasLowercase ? 'met' : ''}`}>
          <span className="password-guidance__check" aria-hidden="true">
            {criteria.hasLowercase ? '✓' : '○'}
          </span>
          <span>Lowercase letter</span>
        </li>
        <li className={`password-guidance__item ${criteria.hasNumber ? 'met' : ''}`}>
          <span className="password-guidance__check" aria-hidden="true">
            {criteria.hasNumber ? '✓' : '○'}
          </span>
          <span>Number</span>
        </li>
        <li className={`password-guidance__item ${criteria.hasSpecial ? 'met' : ''}`}>
          <span className="password-guidance__check" aria-hidden="true">
            {criteria.hasSpecial ? '✓' : '○'}
          </span>
          <span>Special character</span>
        </li>
      </ul>
      {allMet && (
        <p className="password-guidance__all-met">All criteria met!</p>
      )}
    </div>
  );
}

export default PasswordGuidance;
