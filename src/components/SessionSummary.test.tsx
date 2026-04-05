import { render, screen, fireEvent } from '@testing-library/react';
import SessionSummary from './SessionSummary';

describe('SessionSummary', () => {
  const defaultProps = {
    summary: 'A reflective conversation about the nature of control and inner peace.',
    actionItems: [
      'Practice morning reflection on what is within your control',
      'Journal each evening about your virtuous actions',
    ],
    onReset: vi.fn(),
  };

  it('renders session summary with summary text', () => {
    render(<SessionSummary {...defaultProps} />);

    expect(screen.getByRole('region', { name: 'Session Summary' })).toBeInTheDocument();
    expect(screen.getByText('Session Complete')).toBeInTheDocument();
    expect(
      screen.getByText('A reflective conversation about the nature of control and inner peace.'),
    ).toBeInTheDocument();
  });

  it('displays action items when provided', () => {
    render(<SessionSummary {...defaultProps} />);

    expect(screen.getByText('Your Commitments')).toBeInTheDocument();
    expect(
      screen.getByText('Practice morning reflection on what is within your control'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Journal each evening about your virtuous actions'),
    ).toBeInTheDocument();
  });

  it('calls onReset when "Begin New Meditation" button is clicked', () => {
    const onReset = vi.fn();
    render(
      <SessionSummary
        summary="Test summary"
        actionItems={['Item 1']}
        onReset={onReset}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Begin a new meditation session' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('shows fallback message when no action items', () => {
    render(
      <SessionSummary
        summary="Test summary"
        actionItems={[]}
        onReset={defaultProps.onReset}
      />,
    );

    expect(
      screen.getByText('No specific action items were identified during this session.'),
    ).toBeInTheDocument();
  });

  it('has proper ARIA labels and roles', () => {
    render(<SessionSummary {...defaultProps} />);

    expect(screen.getByRole('region', { name: 'Session Summary' })).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Begin a new meditation session' })).toBeInTheDocument();
  });
});
