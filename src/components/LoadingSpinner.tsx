import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

function LoadingSpinner({ size = 'md', label, className = '' }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label || 'Loading'}
      className={`loading-spinner-container ${className}`}
    >
      <span className={`loading-spinner loading-spinner--${size}`} aria-hidden="true" />
      {label && (
        <>
          <span className="loading-spinner-label">{label}</span>
          <span className="sr-only">Loading, please wait</span>
        </>
      )}
      {!label && (
        <span className="sr-only">Loading, please wait</span>
      )}
    </div>
  );
}

export default LoadingSpinner;
