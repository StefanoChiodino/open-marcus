import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { sessionAPI } from '../lib/sessionApi';
import ChatMessage from './ChatMessage';
import LoadingSpinner from './LoadingSpinner';
import type { SessionDetail as SessionDetailType } from '../shared/types';
import './SessionDetail.css';

/**
 * Format duration between two dates
 */
function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return 'In progress';
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  const minutes = Math.round((end - start) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
}

/**
 * Format a date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * SessionDetail component
 * Displays full conversation of a past session when clicked from history.
 *
 * Fulfills: VAL-MEDIT-007 (load previous session)
 */
function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [detail, setDetail] = useState<SessionDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const headerRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    // Focus the header heading when session loads for screen reader context
    if (detail && headerRef.current) {
      headerRef.current.focus();
    }
  }, [detail]);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchSession() {
      try {
        const result = await sessionAPI.getSession(sessionId!);
        if (!cancelled) {
          setDetail(result);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load session';
          setError(message);
          setLoading(false);
        }
      }
    }

    fetchSession();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="session-detail" role="main" aria-label="Session Detail">
        <LoadingSpinner size="md" label="Loading session..." />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="session-detail" role="main" aria-label="Session Detail">
        <div className="session-detail__error" role="alert">
          <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd" />
          </svg>
          <span>Failed to load session: {error}</span>
        </div>
        <Link to="/history" className="button button--secondary session-detail__back-btn">
          Back to History
        </Link>
      </div>
    );
  }

  const { session, messages } = detail;

  // Normalize action_items (backend may return as JSON string or array)
  const actionItems: string[] = Array.isArray(session.action_items)
    ? session.action_items
    : typeof session.action_items === 'string'
      ? (() => {
          try { return JSON.parse(session.action_items); } catch { return []; }
        })()
      : [];

  return (
    <div className="session-detail" role="main" aria-label="Session Detail">
      {/* Header with metadata */}
      <header className="session-detail__header">
        <Link to="/history" className="button button--secondary button--sm session-detail__back-btn">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to History
        </Link>
        <div className="session-detail__meta">
          <h2 ref={headerRef} tabIndex={-1} className="session-detail__title">Session Review</h2>
          <div className="session-detail__meta-info">
            <time className="session-detail__date" dateTime={session.started_at}>
              {formatDate(session.started_at)}
            </time>
            <span className="session-detail__duration">
              {formatDuration(session.started_at, session.ended_at)}
            </span>
            <span className="session-detail__status">&middot; {session.status}</span>
          </div>
        </div>
      </header>
      {/* Summary if available */}
      {session.summary && (
        <section className="session-detail__summary" aria-labelledby="session-summary-heading">
          <h3 id="session-summary-heading" className="session-detail__summary-title">
            Marcus&apos;s Reflection
          </h3>
          <p className="session-detail__summary-content">{session.summary}</p>
        </section>
      )}

      {/* Conversation */}
      <section className="session-detail__conversation" aria-label="Session Conversation">
        {messages.length === 0 ? (
          <p className="text-muted session-detail__empty-messages">
            No messages in this session.
          </p>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
            />
          ))
        )}
      </section>

      {/* Action items if available */}
      {actionItems.length > 0 && (
        <section className="session-detail__actions" aria-labelledby="action-items-heading">
          <h3 id="action-items-heading" className="session-detail__section-title">
            Your Commitments
          </h3>
          <ul className="session-detail__action-items" role="list">
            {actionItems.map((item, index) => (
              <li key={index} className="session-detail__action-item">
                <span className="session-detail__check" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.78 6.22a.75.75 0 010 1.06l-4 4a.75.75 0 01-1.06 0l-2-2a.75.75 0 111.06-1.06L7.25 9.72l3.47-3.47a.75.75 0 011.06 0z" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Footer with back button */}
      <footer className="session-detail__footer">
        <Link to="/history" className="button button--secondary">
          Back to History
        </Link>
      </footer>
    </div>
  );
}

export default SessionDetail;
