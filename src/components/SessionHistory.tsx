import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sessionAPI } from '../lib/sessionApi';
import LoadingSpinner from './LoadingSpinner';
import type { SessionDTO } from '../shared/types';
import './SessionHistory.css';

/**
 * Format a duration in minutes into a human-readable string
 */
function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return 'In progress';
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  const minutes = Math.round((end - start) / 60000);
  return `${minutes} min`;
}

/**
 * Format a date into a readable format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date into a time-only string
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface SessionHistoryItemProps {
  session: SessionDTO;
  firstMessage: string | null;
}

function SessionHistoryItem({ session, firstMessage }: SessionHistoryItemProps) {
  return (
    <Link
      to={`/history/${session.id}`}
      className="session-history-item"
      aria-label={`View session from ${formatDate(session.started_at)}, ${formatDuration(session.started_at, session.ended_at)}`}
    >
      <div className="session-history-item__meta">
        <time className="session-history-item__date" dateTime={session.started_at}>
          {formatDate(session.started_at)}
        </time>
        <span className="session-history-item__time">
          {formatTime(session.started_at)}
        </span>
        <span className="session-history-item__duration">
          {formatDuration(session.started_at, session.ended_at)}
        </span>
      </div>
      {firstMessage && (
        <p className="session-history-item__preview">
          {firstMessage.length > 120 ? `${firstMessage.slice(0, 120)}…` : firstMessage}
        </p>
      )}
      {!firstMessage && (
        <p className="session-history-item__preview text-muted">
          Session with no user messages.
        </p>
      )}
    </Link>
  );
}

/**
 * SessionHistory component
 * Lists past meditation sessions with date/duration.
 * Click on a session to view the full conversation.
 * Shows empty state when no sessions exist.
 *
 * Fulfills: VAL-MEDIT-006 (history listing), VAL-MEDIT-008 (empty state)
 */
function SessionHistory() {
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSessions() {
      try {
        const list = await sessionAPI.listSessions();
        if (!cancelled) {
          // Sort by most recent first
          const sorted = [...list].sort(
            (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
          );
          setSessions(sorted);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load sessions';
          setError(message);
          setLoading(false);
        }
      }
    }

    fetchSessions();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="session-history" role="region" aria-label="Session History">
        <LoadingSpinner size="md" label="Loading session history..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="session-history" role="region" aria-label="Session History">
        <div className="session-history__error" role="alert">
          <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd" />
          </svg>
          <span>Failed to load session history</span>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="session-history" role="region" aria-label="Session History">
        <div className="session-history__empty">
          <div className="session-history__empty-icon" aria-hidden="true">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="currentColor">
              <path d="M32 4L12 14v36l20 10 20-10V14L32 4zm0 5.5l12.5 6.25L32 22 19.5 15.75 32 9.5zM16 20l14 7v20l-14-7V20zm18 27V27l14-7v20l-14 7z" />
            </svg>
          </div>
          <h2>No Meditations Yet</h2>
          <p className="text-muted">
            No meditations yet. Begin your first meditation.
          </p>
          <Link to="/session" className="button button--primary session-history__empty-btn">
            Begin Meditation
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="session-history" role="region" aria-label="Session History">
      <h2 className="session-history__title">Past Meditations</h2>
      <ul className="session-history__list" role="list">
        {sessions.map((session) => (
          <li key={session.id}>
            <SessionHistoryItem
              session={session}
              firstMessage={session.first_message ?? null}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SessionHistory;
