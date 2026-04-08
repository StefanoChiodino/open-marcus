import { useCallback, useEffect, useRef, useState } from "react";
import { useProfileStore } from "../stores/profileStore";
import { useSessionStore } from "../stores/sessionStore";
import { useVoiceStore } from "../stores/voiceStore";
import ChatMessage from "./ChatMessage";
import LoadingSpinner from "./LoadingSpinner";
import SessionSummary from "./SessionSummary";
import VoiceControls, { dispatchSpeak } from "./VoiceControls";
import "./MeditationChat.css";

/**
 * MeditationChat Component
 * Main chat interface for meditation sessions with Marcus Aurelius.
 * Implements streaming responses, session management, and post-session summary.
 */
function MeditationChat() {
	const { profile } = useProfileStore();
	const {
		messages,
		status,
		streamingContent,
		isStreaming,
		summary,
		actionItems,
		error,
		beginSession,
		sendMessage,
		endSession,
		resetSession,
		restoreSession,
	} = useSessionStore();

	const { voiceOutputEnabled } = useVoiceStore();

	// Restore active session from localStorage on mount (handles page refresh)
	useEffect(() => {
		restoreSession();
	}, [restoreSession]);

	const [inputValue, setInputValue] = useState("");
	const [justStreamed, setJustStreamed] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const isWaitingForGreeting = status === "starting";

	// Auto-resize textarea to fit content (up to max-height)
	const autoResizeTextarea = useCallback(() => {
		const textarea = textareaRef.current;
		if (textarea) {
			// Reset height to auto to get the correct scrollHeight
			textarea.style.height = "auto";
			// Set height to scrollHeight, but respect max-height
			const newHeight = Math.min(textarea.scrollHeight, 200); // 200px max
			textarea.style.height = `${newHeight}px`;
		}
	}, []);

	// Track when streaming just completed (for speaking the response)
	useEffect(() => {
		if (!isStreaming && messages.length > 0) {
			const lastMsg = messages[messages.length - 1];
			if (lastMsg?.role === "assistant" && lastMsg.content.length > 0) {
				setJustStreamed(true);
			}
		}
	}, [isStreaming, messages.length, messages]);

	// Speak the last assistant response if voice output is enabled
	useEffect(() => {
		if (justStreamed && voiceOutputEnabled && messages.length > 0) {
			const lastMsg = messages[messages.length - 1];
			if (lastMsg?.role === "assistant" && lastMsg.content.length > 0) {
				dispatchSpeak(lastMsg.content);
			}
			setJustStreamed(false);
		}
	}, [justStreamed, voiceOutputEnabled, messages.length]);

	// Handle voice transcription - insert transcribed text into input field
	const handleVoiceTranscript = useCallback((text: string) => {
		setInputValue(text);
		// Focus the textarea so user can review/edit before sending
		setTimeout(() => {
			textareaRef.current?.focus();
		}, 0);
	}, []);

	// Auto-scroll to bottom of messages container
	useEffect(() => {
		const messagesEl = messagesEndRef.current?.parentElement;
		if (messagesEl) {
			messagesEl.scrollTop = messagesEl.scrollHeight;
		}
	}, [messages, streamingContent]);

	// Focus textarea when session becomes active
	useEffect(() => {
		if (status === "active" && textareaRef.current) {
			textareaRef.current.focus();
		}
	}, [status]);

	// Reset textarea height when session resets
	useEffect(() => {
		if ((status === "idle" || status === "starting") && textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}
	}, [status]);

	const handleBeginSession = useCallback(() => {
		beginSession();
	}, [beginSession]);

	const handleSendMessage = useCallback(async () => {
		const trimmed = inputValue.trim();
		if (!trimmed || isStreaming || status === "ending") return;

		setInputValue("");
		await sendMessage(trimmed);
	}, [inputValue, isStreaming, status, sendMessage]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSendMessage();
			}
		},
		[handleSendMessage],
	);

	const handleEndSession = useCallback(async () => {
		await endSession();
	}, [endSession]);

	const handleReset = useCallback(() => {
		resetSession();
	}, [resetSession]);

	const handleTextareaChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setInputValue(e.target.value);
			// Auto-resize textarea on content change
			autoResizeTextarea();
		},
		[autoResizeTextarea],
	);

	// ---- Error View ----
	// Show dedicated error view when status is 'error' OR when error is set during active/streaming/starting.
	// This ensures error UI is always prominent, never hidden in a chat view.
	// Special case: if status === "error" but error is empty, show a generic message.
	const displayError = error || (status === "error" ? "An error occurred. Please try again." : "");
	if (displayError && (status === "error" || status === "active" || status === "streaming" || status === "starting")) {
		return (
			<div
				className="meditation-chat"
				role="main"
				aria-label="Meditation Session Error"
			>
				<div className="meditation-chat__error-view">
					<div className="meditation-chat__error-icon" aria-hidden="true">
						<svg
							width="48"
							height="48"
							viewBox="0 0 24 24"
							fill="currentColor"
						>
							<path
								fillRule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clipRule="evenodd"
							/>
						</svg>
					</div>
					<h2 className="meditation-chat__error-title">Session Error</h2>
					<p className="meditation-chat__error-message" role="alert" aria-live="polite">
						{displayError}
					</p>
					<button
						onClick={handleReset}
						className="button button--primary button--lg"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	// ---- Begin Session View ----
	if (status === "idle" || status === "starting") {
		return (
			<div
				className="meditation-chat"
				role="main"
				aria-label="Meditation Session"
			>
				<div className="meditation-chat__welcome">
					<div className="meditation-chat__icon" aria-hidden="true">
						<img src="/open-marcus-logo.jpg" alt="" width="64" height="64" />
					</div>
					<h2 className="meditation-chat__title">
						Meditation with Marcus Aurelius
					</h2>
					<p className="meditation-chat__description">
						{profile
							? `Welcome back, ${profile.name}. Ready for some stoic reflection and guided meditation? Marcus is here to help you explore your thoughts.`
							: "Ready for some stoic reflection and guided meditation? Marcus is here to help you explore your thoughts."}
					</p>
					<button
						onClick={handleBeginSession}
						className="button button--primary button--lg meditation-chat__begin-btn"
						disabled={isWaitingForGreeting || !profile}
						aria-label="Begin meditation session"
					>
						{isWaitingForGreeting ? (
							<>
								<LoadingSpinner size="sm" />
								Opening the gates of wisdom...
							</>
						) : (
							"Begin Meditation"
						)}
					</button>
					<div className="meditation-chat__disclaimer" role="note">
						<strong>Note:</strong> OpenMarcus is not therapy or medical advice.
						It is a reflection tool based on stoic philosophy.
					</div>
				</div>
			</div>
		);
	}

	// ---- Session Summary View ----
	if (status === "summary" && summary) {
		return (
			<div
				className="meditation-chat"
				role="main"
				aria-label="Meditation Session"
			>
				<SessionSummary
					summary={summary}
					actionItems={actionItems}
					onReset={handleReset}
				/>
			</div>
		);
	}

	// ---- Active Chat View ----
	return (
		<div
			className="meditation-chat meditation-chat--active"
			role="main"
			aria-label="Active Meditation Session"
		>
			{/* Header */}
			<header className="meditation-chat__header">
				<h2 className="meditation-chat__header-title">
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fillRule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
							clipRule="evenodd"
						/>
					</svg>
					Meditation with Marcus
				</h2>
				<button
					onClick={handleEndSession}
					className="button button--secondary button--sm"
					disabled={status === "ending"}
					aria-label="End meditation session"
				>
					{status === "ending" ? (
						<>
							<LoadingSpinner size="sm" />
							Closing session...
						</>
					) : (
						"End Session"
					)}
				</button>
			</header>

			{/* Disclaimer */}
			<div className="meditation-chat__disclaimer" role="note">
				OpenMarcus is not therapy or medical advice. It is a reflection tool
				based on stoic philosophy.
			</div>

			{/* Error display */}
			{error && (
				<div className="meditation-chat__error" role="alert" aria-live="polite">
					<svg
						width="20"
						height="20"
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fillRule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clipRule="evenodd"
						/>
					</svg>
					<span>{error}</span>
				</div>
			)}

			{/* Messages area */}
			<div
				className="meditation-chat__messages"
				role="log"
				aria-label="Chat messages"
				aria-live="polite"
				aria-relevant="additions"
				aria-atomic="false"
			>
				{messages.length === 0 && !isStreaming ? (
					<div className="meditation-chat__empty">
						<p className="text-serif meditation-chat__greeting">
							{profile
								? `I'm Marcus. Hey there, ${profile.name}. What's on your mind? Let's take a moment to explore your thoughts together.`
								: "I'm Marcus. What's on your mind? Let's take a moment to explore your thoughts together."}
						</p>
						<p className="text-muted meditation-chat__prompt-hint">
							Type your thoughts, concerns, or questions below.
						</p>
					</div>
				) : (
					<>
						{messages.map((msg) => (
							<ChatMessage key={msg.id} role={msg.role} content={msg.content} />
						))}
						{/* Streaming message being typed */}
						{isStreaming && streamingContent && (
							<ChatMessage
								role="assistant"
								content={streamingContent}
								isStreaming={true}
							/>
						)}
						{/* Loading indicator while waiting for first token */}
						{isStreaming && !streamingContent && (
							<div className="meditation-chat__loading-response">
								<LoadingSpinner size="sm" label="Marcus is reflecting..." />
							</div>
						)}
					</>
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input area */}
			<div className="meditation-chat__input-area">
				<div className="meditation-chat__input-wrapper">
					<VoiceControls
						onTranscript={handleVoiceTranscript}
						disabled={isStreaming || status === "ending"}
					/>
					<textarea
						ref={textareaRef}
						value={inputValue}
						onChange={handleTextareaChange}
						onKeyDown={handleKeyDown}
						placeholder={
							isStreaming
								? "Waiting for Marcus to finish..."
								: "Share your thoughts or questions..."
						}
						disabled={isStreaming || status === "ending"}
						className="meditation-chat__textarea"
						rows={1}
						aria-label="Type your message to Marcus"
					/>
					<button
						onClick={handleSendMessage}
						className="meditation-chat__send-btn"
						disabled={!inputValue.trim() || isStreaming || status === "ending"}
						aria-label="Send message"
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
						</svg>
					</button>
				</div>
				<p className="meditation-chat__input-hint text-muted">
					Press Enter to send · Shift+Enter for new line
				</p>
			</div>
		</div>
	);
}

export default MeditationChat;
