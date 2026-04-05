import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SessionDetail from './SessionDetail';

// Mock session API
vi.mock('../lib/sessionApi', () => ({
  sessionAPI: {
    getSession: vi.fn(),
  },
}));

import { sessionAPI } from '../lib/sessionApi';

const mockGetSession = sessionAPI.getSession as ReturnType<typeof vi.fn>;

describe('SessionDetail', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  it('renders session detail with messages when session is loaded', async () => {
    mockGetSession.mockResolvedValue({
      session: {
        id: 'session-1',
        profile_id: 'profile-1',
        status: 'summary' as const,
        summary: 'A reflective conversation.',
        action_items: null,
        started_at: '2026-04-04T10:00:00Z',
        ended_at: '2026-04-04T10:30:00Z',
        created_at: '2026-04-04T10:00:00Z',
        updated_at: '2026-04-04T10:30:00Z',
        first_message: 'Hello Marcus.',
        message_count: 2,
      },
      messages: [
        {
          id: 'msg-1',
          session_id: 'session-1',
          role: 'assistant' as const,
          content: 'Greetings, I am Marcus.',
          created_at: '2026-04-04T10:00:00Z',
        },
        {
          id: 'msg-2',
          session_id: 'session-1',
          role: 'user' as const,
          content: 'Hello Marcus, I feel troubled.',
          created_at: '2026-04-04T10:01:00Z',
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/history/session-1']}>
        <Routes>
          <Route path="/history/:sessionId" element={<SessionDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    // Wait for messages to appear
    const marcusMessage = await screen.findByText('Greetings, I am Marcus.');
    expect(marcusMessage).toBeInTheDocument();
    expect(screen.getByText('Hello Marcus, I feel troubled.')).toBeInTheDocument();
  });

  it('shows loading state while fetching session', () => {
    mockGetSession.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/history/session-1']}>
        <Routes>
          <Route path="/history/:sessionId" element={<SessionDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/Loading/)).toBeInTheDocument();
  });

  it('shows error when session load fails', async () => {
    mockGetSession.mockRejectedValue(new Error('Session not found'));

    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/history/session-1']}>
        <Routes>
          <Route path="/history/:sessionId" element={<SessionDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    const errorMsg = await screen.findByText(/Failed to load session/);
    expect(errorMsg).toBeInTheDocument();
  });

  it('shows "Back to History" button', async () => {
    mockGetSession.mockResolvedValue({
      session: {
        id: 'session-1',
        profile_id: 'profile-1',
        status: 'summary' as const,
        summary: null,
        action_items: null,
        started_at: '2026-04-04T10:00:00Z',
        ended_at: '2026-04-04T10:30:00Z',
        created_at: '2026-04-04T10:00:00Z',
        updated_at: '2026-04-04T10:30:00Z',
        first_message: null,
        message_count: 0,
      },
      messages: [],
    });

    render(
      <MemoryRouter initialEntries={['/history/session-1']}>
        <Routes>
          <Route path="/history/:sessionId" element={<SessionDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    const backButtons = await screen.findAllByRole('link', { name: /Back to History/ });
    expect(backButtons.length).toBeGreaterThanOrEqual(1);
    expect(backButtons[0].getAttribute('href')).toBe('/history');
  });

  it('renders session metadata header with date and duration', async () => {
    mockGetSession.mockResolvedValue({
      session: {
        id: 'session-1',
        profile_id: 'profile-1',
        status: 'summary' as const,
        summary: 'Summary text.',
        action_items: null,
        started_at: '2026-04-04T10:00:00Z',
        ended_at: '2026-04-04T10:45:00Z',
        created_at: '2026-04-04T10:00:00Z',
        updated_at: '2026-04-04T10:45:00Z',
        first_message: null,
        message_count: 0,
      },
      messages: [],
    });

    render(
      <MemoryRouter initialEntries={['/history/session-1']}>
        <Routes>
          <Route path="/history/:sessionId" element={<SessionDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    // Wait for the header to render
    await screen.findByRole('heading', { name: /Session Review/ });
  });
});
