/**
 * Tests for the RecordingIndicator component
 */

import { render, screen } from '@testing-library/react';
import RecordingIndicator from './RecordingIndicator';

describe('RecordingIndicator', () => {
  it('renders when isRecording is true', () => {
    render(<RecordingIndicator isRecording={true} statusText="Recording your voice..." />);

    expect(screen.getByText('Recording your voice...')).toBeInTheDocument();
    const dot = screen.getByRole('status').querySelector('.recording-indicator__dot');
    expect(dot).toBeInTheDocument();
  });

  it('does not render when isRecording is false', () => {
    render(<RecordingIndicator isRecording={false} statusText="Not recording" />);

    expect(screen.queryByText('Not recording')).not.toBeInTheDocument();
  });

  it('uses default status text', () => {
    render(<RecordingIndicator isRecording={true} />);

    expect(screen.getByText('Recording...')).toBeInTheDocument();
  });

  it('has role="status" for accessibility', () => {
    render(<RecordingIndicator isRecording={true} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-live="polite" for screen readers', () => {
    render(<RecordingIndicator isRecording={true} />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('has aria-label with status text', () => {
    render(<RecordingIndicator isRecording={true} statusText="Listening..." />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Listening...');
  });
});
