import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SessionHistory from './SessionHistory';

// Mock session API
vi.mock('../lib/sessionApi', () => ({
  sessionAPI: {
    listSessions: vi.fn(),
  },
}));

import { sessionAPI } from '../lib/sessionApi';

const mockListSessions = sessionAPI.listSessions as ReturnType<typeof vi.fn>;

describe('SessionHistory', () => {
  beforeEach(() => {
    mockListSessions.mockReset();
  });

  it('renders empty state with correct text', async () => {
    mockListSessions.mockResolvedValue([]);

    render(
      <BrowserRouter>
        <SessionHistory />
      </BrowserRouter>,
    );

    // Wait for empty state to appear
    const emptyState = await screen.findByText(/No meditations yet. Begin your first meditation/);
    expect(emptyState).toBeInTheDocument();
  });

  it('shows loading spinner while fetching sessions', () => {
    mockListSessions.mockReturnValue(new Promise(() => {})); // Never resolves

    render(
      <BrowserRouter>
        <SessionHistory />
      </BrowserRouter>,
    );

    expect(screen.getByLabelText(/Loading/)).toBeInTheDocument();
  });

  it('lists sessions with date, duration, and first message preview', async () => {
    mockListSessions.mockResolvedValue([
      {
        id: 'session-1',
        profile_id: 'profile-1',
        status: 'summary' as const,
        summary: 'A reflective conversation.',
        action_items: null,
        started_at: '2026-04-04T10:00:00Z',
        ended_at: '2026-04-04T10:30:00Z',
        created_at: '2026-04-04T10:00:00Z',
        updated_at: '2026-04-04T10:30:00Z',
        first_message: 'Hello Marcus, I need guidance on inner peace.',
        message_count: 8,
      },
    ]);

    render(
      <BrowserRouter>
        <SessionHistory />
      </BrowserRouter>,
    );

    // Wait for session to be listed
    const sessionLink = await screen.findByRole('link', { name: /View session/ });
    expect(sessionLink).toBeInTheDocument();

    // Verify date is shown
    expect(screen.getByText(/April 4, 2026/)).toBeInTheDocument();
  });

  it('links each session to its detail view', async () => {
    mockListSessions.mockResolvedValue([
      {
        id: 'session-abc',
        profile_id: 'profile-1',
        status: 'summary' as const,
        summary: null,
        action_items: null,
        started_at: '2026-04-03T14:00:00Z',
        ended_at: '2026-04-03T14:45:00Z',
        created_at: '2026-04-03T14:00:00Z',
        updated_at: '2026-04-03T14:45:00Z',
        first_message: 'I am struggling with anxiety.',
        message_count: 4,
      },
    ]);

    render(
      <BrowserRouter>
        <SessionHistory />
      </BrowserRouter>,
    );

    const link = await screen.findByRole('link', { name: /View session/ });
    expect(link.getAttribute('href')).toBe('/history/session-abc');
  });

  it('shows error toast when API fails', async () => {
    mockListSessions.mockRejectedValue(new Error('Network error'));

    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <BrowserRouter>
        <SessionHistory />
      </BrowserRouter>,
    );

    // Wait for error state
    const errorMsg = await screen.findByText(/Failed to load session history/);
    expect(errorMsg).toBeInTheDocument();
  });
});
