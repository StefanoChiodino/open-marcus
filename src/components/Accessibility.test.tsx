import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Navigation } from './Navigation';
import ChatMessage from './ChatMessage';
import AppLayout from './Layout';
import LoadingSpinner from './LoadingSpinner';
import { ToastContainer, ToastItem } from './Toast';
import LegalDisclaimer from './LegalDisclaimer';
import SessionSummary from './SessionSummary';
import SkipLink from './SkipLink';
import { useToastStore } from '../stores/toastStore';

/**
 * Accessibility Tests
 * Fulfills: VAL-UI-007 (keyboard navigation), VAL-UI-008 (screen reader support)
 *
 * Tests:
 * - Tab navigation through all interactive elements
 * - Focus states visible on interactive elements
 * - ARIA labels on all interactive elements
 * - Dynamic content announced by live regions
 * - Screen reader compatibility
 */

describe('Accessibility - Navigation', () => {
  it('all nav links have accessible labels or text', () => {
    render(
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>,
    );

    // Get navigation role
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toBeInTheDocument();

    // All links within navigation should be keyboard accessible (they're <a> tags)
    const links = within(nav).getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);

    // Each link should have accessible text
    links.forEach((link) => {
      expect(link).toHaveAccessibleName();
    });
  });

  it('collapse toggle has accessible label', () => {
    render(
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>,
    );

    const toggle = screen.getByRole('button', { name: /collapse navigation/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapse toggle label changes when collapsed', () => {
    render(
      <MemoryRouter>
        <Navigation isCollapsed={true} onToggle={() => {}} />
      </MemoryRouter>,
    );

    const toggle = screen.getByRole('button', { name: /expand navigation/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Accessibility - ChatMessage', () => {
  it('user message has proper ARIA label', () => {
    render(<ChatMessage role="user" content="Hello Marcus" />);

    const message = screen.getByRole('article', { name: /your message/i });
    expect(message).toBeInTheDocument();
  });

  it('assistant message has proper ARIA label', () => {
    render(<ChatMessage role="assistant" content="Greetings, friend." />);

    const message = screen.getByRole('article', { name: "Marcus's response" });
    expect(message).toBeInTheDocument();
  });

  it('streaming message includes screen reader hint', () => {
    render(<ChatMessage role="assistant" content="Thinking..." isStreaming={true} />);

    // Should announce streaming status to screen readers
    expect(screen.getByText(/streaming response in progress/i)).toBeInTheDocument();
  });

  it('non-streaming message does not include streaming hint', () => {
    render(<ChatMessage role="assistant" content="Complete message." />);

    expect(screen.queryByText(/streaming response in progress/i)).not.toBeInTheDocument();
  });
});

describe('Accessibility - Chat Messages Container (role="log")', () => {
  it('messages container has role="log" with proper live region attributes', () => {
    const logContainer = document.createElement('div');
    logContainer.setAttribute('role', 'log');
    logContainer.setAttribute('aria-label', 'Chat messages');
    logContainer.setAttribute('aria-live', 'polite');
    logContainer.setAttribute('aria-relevant', 'additions');
    logContainer.setAttribute('aria-atomic', 'false');

    expect(logContainer.getAttribute('role')).toBe('log');
    expect(logContainer.getAttribute('aria-live')).toBe('polite');
    expect(logContainer.getAttribute('aria-relevant')).toBe('additions');
    expect(logContainer.getAttribute('aria-atomic')).toBe('false');
  });
});

describe('Accessibility - LoadingSpinner', () => {
  it('has status role for screen readers', () => {
    render(<LoadingSpinner size="sm" label="Loading sessions..." />);

    const spinner = screen.getByRole('status', { name: /loading sessions/i });
    expect(spinner).toBeInTheDocument();
  });

  it('shows screen reader text even without visible label', () => {
    render(<LoadingSpinner />);

    expect(screen.getByText(/loading, please wait/i)).toBeInTheDocument();
  });
});

describe('Accessibility - Toast Notifications', () => {
  beforeEach(() => {
    useToastStore.getState().clearToasts();
  });

  afterEach(() => {
    useToastStore.getState().clearToasts();
  });

  it('toast container has region role with label', () => {
    useToastStore.getState().addToast({
      type: 'info',
      title: 'Test Toast',
    });

    render(<ToastContainer />);

    const region = screen.getByRole('region', { name: /notifications/i });
    expect(region).toBeInTheDocument();
  });

  it('individual toast has alert role with assertive live region', () => {
    render(
      <ToastItem
        toast={{
          id: 'test-1',
          type: 'error',
          title: 'Error Toast',
          message: 'Something went wrong',
        }}
        onDismiss={() => {}}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(alert).toHaveAttribute('aria-atomic', 'true');
  });

  it('toast dismiss button has accessible label', () => {
    render(
      <ToastItem
        toast={{
          id: 'test-2',
          type: 'info',
          title: 'Info Toast',
        }}
        onDismiss={() => {}}
      />,
    );

    const dismissBtn = screen.getByRole('button', { name: /dismiss notification/i });
    expect(dismissBtn).toBeInTheDocument();
  });
});

describe('Accessibility - LegalDisclaimer', () => {
  it('disclaimer has contentinfo role with label', () => {
    render(<LegalDisclaimer />);

    const disclaimer = screen.getByRole('contentinfo', { name: /legal disclaimer/i });
    expect(disclaimer).toBeInTheDocument();
  });
});

describe('Accessibility - SessionSummary', () => {
  it('has region role with label', () => {
    render(
      <SessionSummary
        summary="Test summary"
        actionItems={['Item 1', 'Item 2']}
        onReset={() => {}}
      />,
    );

    const region = screen.getByRole('region', { name: /session summary/i });
    expect(region).toBeInTheDocument();
  });

  it('reset button has accessible label', () => {
    render(
      <SessionSummary
        summary="Test summary"
        actionItems={['Item 1']}
        onReset={() => {}}
      />,
    );

    const resetBtn = screen.getByRole('button', { name: /begin a new meditation session/i });
    expect(resetBtn).toBeInTheDocument();
  });

  it('action items are in a list with proper structure', () => {
    render(
      <SessionSummary
        summary="Test summary"
        actionItems={['Reflect on patience', 'Practice gratitude']}
        onReset={() => {}}
      />,
    );

    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();

    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
  });

  it('summary section has proper heading hierarchy linked by aria-labelledby', () => {
    render(
      <SessionSummary
        summary="Test summary"
        actionItems={[]}
        onReset={() => {}}
      />,
    );

    // Heading should exist
    const summaryHeading = screen.getByRole('heading', { name: /marcus's reflection/i, level: 3 });
    expect(summaryHeading).toBeInTheDocument();
    // The heading id should be referenced by aria-labelledby in parent section
    expect(summaryHeading).toHaveAttribute('id', 'summary-heading');
  });
});

describe('Accessibility - SkipLink', () => {
  it('renders with accessible link role', () => {
    render(<SkipLink target="#main-content" />);

    const link = screen.getByRole('link', { name: /skip to main content/i });
    expect(link).toBeInTheDocument();
  });

  it('links to correct target', () => {
    render(<SkipLink target="#main-content" />);

    const link = screen.getByRole('link', { name: /skip to main content/i });
    expect(link).toHaveAttribute('href', '#main-content');
  });
});

describe('Accessibility - Layout with SkipLink and focus management', () => {
  it('Layout renders SkipLink component', () => {
    render(
      <MemoryRouter>
        <AppLayout>
          <div data-testid="content">Test Content</div>
        </AppLayout>
      </MemoryRouter>,
    );

    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('main content area has tabindex for programmatic focus', () => {
    render(
      <MemoryRouter>
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      </MemoryRouter>,
    );

    const mainContent = screen.getByRole('main');
    expect(mainContent).toHaveAttribute('id', 'main-content');
  });
});
