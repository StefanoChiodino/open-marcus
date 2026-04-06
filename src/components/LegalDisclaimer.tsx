import './LegalDisclaimer.css';

/**
 * LegalDisclaimer Component
 * 
 * Displays a visible disclaimer stating that OpenMarcus is not therapy or medical advice.
 * Should be visible on every page to fulfill legal safety requirements.
 * 
 * Fulfills: VAL-LEGAL-001
 */
function LegalDisclaimer() {
  return (
    <footer className="legal-disclaimer" role="contentinfo" aria-label="Legal disclaimer">
      <div className="legal-disclaimer__content">
        <svg
          className="legal-disclaimer__icon"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM8 4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
        <p className="legal-disclaimer__text">
          <strong>Important:</strong> OpenMarcus is not therapy or medical advice.
          It is a reflection tool based on stoic philosophy. If you&apos;re experiencing a crisis,
          please contact a mental health professional or call your local emergency services.
        </p>
      </div>
    </footer>
  );
}

export default LegalDisclaimer;
