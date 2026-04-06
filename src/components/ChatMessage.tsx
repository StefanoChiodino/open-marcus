import './ChatMessage.css';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

function ChatMessage({ role, content, isStreaming = false }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div
      className={`chat-message chat-message--${role}`}
      role="article"
      aria-label={isUser ? 'Your message' : "Marcus's response"}
      aria-roledescription="message"
    >
      <div className="chat-message__avatar" aria-hidden="true">
        {isUser ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M12 2a5 5 0 100 10 5 5 0 000-10zM6 20a2 2 0 01-2-2c0-3.314 2.643-6 6-6s6 2.686 6 6a2 2 0 01-2 2H6z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm0 14.5c-3.093 0-5.813-1.54-7.188-3.914C5.696 13.764 8.653 12.5 12 12.5s6.304 1.264 7.188 3.086C17.813 17.96 15.093 19.5 12 19.5z" />
          </svg>
        )}
      </div>
      <div className="chat-message__content">
        <div className="chat-message__bubble">
          <div className="chat-message__text">{content}</div>
          {isStreaming && (
            <span className="chat-message__cursor" aria-hidden="true">▋</span>
          )}
          {isStreaming && (
            <span className="sr-only"> (streaming response in progress)</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
