import { useEffect, useRef } from 'react';
import './SessionSummary.css';

interface SessionSummaryProps {
  summary: string;
  actionItems: string[];
  onReset: () => void;
}

/**
 * Session Summary Screen
 * Displays Marcus's session summary and action items after ending a meditation.
 */
function SessionSummary({ summary, actionItems, onReset }: SessionSummaryProps) {
  const resetBtnRef = useRef<HTMLButtonElement>(null);

  // Focus the "Begin New Meditation" button when summary appears
  // This ensures keyboard/screen-reader users know the session has ended
  useEffect(() => {
    resetBtnRef.current?.focus();
  }, []);
  return (
    <div className="session-summary" role="region" aria-label="Session Summary">
      <div className="session-summary__header">
        <div className="session-summary__icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
            <path d="M24 4L8 12v24l16 8 16-8V12L24 4zm0 4.5l10.5 5.25L24 19 13.5 13.75 24 8.5zM12 16.5l10 5v13l-10-5v-13zm14 12.5v-5l10-5v5l-10 5zM26 34.5l-4-2-4 2V18.5l8-4 8 4v16l-8 4z" />
          </svg>
        </div>
        <h2 className="session-summary__title">Session Complete</h2>
        <p className="session-summary__subtitle">
          Your reflections have been recorded and preserved.
        </p>
      </div>

      <section className="session-summary__section" aria-labelledby="summary-heading">
        <h3 id="summary-heading" className="session-summary__section-title">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path
              fillRule="evenodd"
              d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Marcus's Reflection
        </h3>
        <div className="session-summary__content">
          {summary}
        </div>
      </section>

      <section className="session-summary__section" aria-labelledby="action-items-heading">
        <h3 id="action-items-heading" className="session-summary__section-title">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Your Commitments
        </h3>
        {actionItems.length > 0 ? (
          <ul className="session-summary__action-items" role="list">
            {actionItems.map((item, index) => (
              <li key={index} className="session-summary__action-item">
                <span className="session-summary__action-item-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.78 6.22a.75.75 0 010 1.06l-4 4a.75.75 0 01-1.06 0l-2-2a.75.75 0 111.06-1.06L7.25 9.72l3.47-3.47a.75.75 0 011.06 0z" />
                  </svg>
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No specific action items were identified during this session.</p>
        )}
      </section>

      <div className="session-summary__actions">
        <button
          ref={resetBtnRef}
          onClick={onReset}
          className="button button--primary"
          aria-label="Begin a new meditation session"
        >
          Begin New Meditation
        </button>
      </div>
    </div>
  );
}

export default SessionSummary;
