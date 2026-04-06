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
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/d/d6/Marcus_Annius_Verus_Caesar.jpg"
            alt="Marcus Aurelius"
            width="24"
            height="24"
            className="chat-message__avatar-image"
          />
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
