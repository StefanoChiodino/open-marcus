import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToastContainer, ToastItem } from './Toast';
import { useToastStore } from '../stores/toastStore';

describe('ToastItem', () => {
  const mockToast = {
    id: 'test-1',
    type: 'error' as const,
    title: 'Error Title',
    message: 'Error message text',
    duration: 5000,
  };

  it('renders error toast with title and message', () => {
    const onDismiss = vi.fn();
    render(<ToastItem toast={mockToast} onDismiss={onDismiss} />);

    expect(screen.getByText('Error Title')).toBeInTheDocument();
    expect(screen.getByText('Error message text')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('displays dismiss button and calls onDismiss when clicked', () => {
    const onDismiss = vi.fn();
    render(<ToastItem toast={mockToast} onDismiss={onDismiss} />);

    const dismissButton = screen.getByRole('button', { name: /dismiss notification/i });
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledWith('test-1');
  });

  it('renders success toast with correct styling', () => {
    const onDismiss = vi.fn();
    render(
      <ToastItem
        toast={{ ...mockToast, type: 'success', title: 'Success' }}
        onDismiss={onDismiss}
      />
    );

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('toast--success');
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('renders warning toast with correct styling', () => {
    const onDismiss = vi.fn();
    render(
      <ToastItem
        toast={{ ...mockToast, type: 'warning', title: 'Warning' }}
        onDismiss={onDismiss}
      />
    );

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('toast--warning');
  });

  it('renders info toast with correct styling', () => {
    const onDismiss = vi.fn();
    render(
      <ToastItem
        toast={{ ...mockToast, type: 'info', title: 'Information' }}
        onDismiss={onDismiss}
      />
    );

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('toast--info');
  });

  it('renders without message (title only)', () => {
    const onDismiss = vi.fn();
    render(
      <ToastItem
        toast={{ ...mockToast, message: undefined }}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('Error Title')).toBeInTheDocument();
  });

  it('auto-dismisses after duration expires', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(
      <ToastItem
        toast={{ ...mockToast, duration: 2000 }}
        onDismiss={onDismiss}
      />
    );

    // Advance timer past duration
    vi.advanceTimersByTime(2500);

    expect(onDismiss).toHaveBeenCalledWith('test-1');
    vi.useRealTimers();
  });

  it('does not auto-dismiss when duration is 0', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(
      <ToastItem
        toast={{ ...mockToast, duration: 0 }}
        onDismiss={onDismiss}
      />
    );

    vi.advanceTimersByTime(10000);

    expect(onDismiss).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('ToastContainer', () => {
  beforeEach(() => {
    useToastStore.getState().clearToasts();
  });

  it('renders nothing when no toasts', () => {
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it('renders toasts from store', () => {
    useToastStore.getState().addToast({
      type: 'error',
      title: 'Connection Error',
      message: 'Unable to connect to server',
    });

    render(<ToastContainer />);

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText('Unable to connect to server')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /notifications/i })).toBeInTheDocument();
  });

  it('renders multiple toasts', () => {
    useToastStore.getState().addToast({
      type: 'error',
      title: 'Error One',
    });
    useToastStore.getState().addToast({
      type: 'success',
      title: 'Success Two',
    });

    render(<ToastContainer />);

    expect(screen.getByText('Error One')).toBeInTheDocument();
    expect(screen.getByText('Success Two')).toBeInTheDocument();
  });

  it('dismisses toast when close button clicked', () => {
    useToastStore.getState().addToast({
      type: 'error',
      title: 'Dismiss Me',
    });

    render(<ToastContainer />);
    expect(screen.getByText('Dismiss Me')).toBeInTheDocument();

    // Dismiss the first toast
    const dismissButtons = screen.getAllByRole('button', { name: /dismiss notification/i });
    fireEvent.click(dismissButtons[0]);

    expect(screen.queryByText('Dismiss Me')).not.toBeInTheDocument();
  });
});
