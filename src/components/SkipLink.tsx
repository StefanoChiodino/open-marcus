/**
 * SkipToContent link for keyboard accessibility
 * Provides a way for keyboard users to bypass navigation and jump directly to main content
 * Fulfills: VAL-UI-007 (keyboard navigation)
 */
import './SkipLink.css';

interface SkipLinkProps {
  /** The target element selector (e.g., '#main-content') */
  target: string;
  /** The visible label text */
  label?: string;
}

function SkipLink({ target = '#main-content', label = 'Skip to main content' }: SkipLinkProps) {
  return (
    <a
      href={target}
      className="skip-link"
      aria-label={label}
    >
      {label}
    </a>
  );
}

export default SkipLink;
