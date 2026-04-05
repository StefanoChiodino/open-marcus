import { render, screen } from '@testing-library/react';
import ChatMessage from './ChatMessage';

describe('ChatMessage', () => {
  it('renders user message correctly', () => {
    render(<ChatMessage role="user" content="Hello Marcus" />);

    expect(screen.getByRole('article', { name: 'Your message' })).toBeInTheDocument();
    expect(screen.getByText('Hello Marcus')).toBeInTheDocument();
    expect(screen.getByText('Hello Marcus').closest('.chat-message')).toHaveClass(
      'chat-message--user',
    );
  });

  it('renders assistant message correctly', () => {
    render(<ChatMessage role="assistant" content="Greetings, seeker." />);

    expect(screen.getByRole('article', { name: 'Marcus response' })).toBeInTheDocument();
    expect(screen.getByText('Greetings, seeker.')).toBeInTheDocument();
    expect(screen.getByText('Greetings, seeker.').closest('.chat-message')).toHaveClass(
      'chat-message--assistant',
    );
  });

  it('shows streaming cursor when isStreaming is true', () => {
    render(<ChatMessage role="assistant" content="Thinking" isStreaming={true} />);

    expect(screen.getByText('Thinking')).toBeInTheDocument();
    const cursor = screen.getByText('▋');
    expect(cursor).toBeInTheDocument();
    expect(cursor).toHaveClass('chat-message__cursor');
  });

  it('does not show streaming cursor when isStreaming is false', () => {
    render(<ChatMessage role="assistant" content="Complete thought." isStreaming={false} />);

    expect(screen.queryByText('▋')).not.toBeInTheDocument();
  });

  it('renders long content with proper word wrap', () => {
    const longContent = 'A very long message that tests the rendering capabilities of the chat message component.';
    render(<ChatMessage role="user" content={longContent} />);

    expect(screen.getByText(longContent)).toBeInTheDocument();
  });

  it('has accessible labels for both roles', () => {
    const { rerender } = render(<ChatMessage role="user" content="Test" />);
    expect(screen.getByRole('article', { name: 'Your message' })).toBeInTheDocument();

    rerender(<ChatMessage role="assistant" content="Test" />);
    expect(screen.getByRole('article', { name: 'Marcus response' })).toBeInTheDocument();
  });
});
