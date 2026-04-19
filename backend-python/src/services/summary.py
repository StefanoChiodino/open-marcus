"""
Session Summary Service.

Provides AI-powered session summary generation by analyzing
conversation messages and extracting key insights.
"""

from typing import Optional, List
from sqlalchemy.orm import Session as DBSession

from ..models.message import Message as MessageModel
from .session import SessionService


class SummaryService:
    """
    Service for generating session summaries.
    
    Analyzes conversation messages to create a meaningful
    summary of the meditation session.
    """
    
    def generate_summary(self, db: DBSession, session_id: str, user_id: str) -> Optional[str]:
        """
        Generate a summary for a session based on its messages.
        
        This uses a simple extraction-based approach that:
        1. Gets all messages for the session
        2. Analyzes the conversation themes
        3. Creates a concise summary
        
        The actual AI-powered analysis would be done via LLM in a
        future enhancement. This implementation provides a working
        fallback that extracts key information from messages.
        
        Args:
            db: Database session
            session_id: ID of the session
            user_id: ID of the user (for authorization)
            
        Returns:
            Generated summary string, or None if session not found
        """
        # Get session with messages
        session_service = SessionService()
        session = session_service.get_session_with_messages(db, session_id, user_id)
        
        if session is None:
            return None
        
        # Analyze messages and generate summary
        messages = session.messages
        
        if not messages:
            return "Empty session - no messages recorded."
        
        return self._analyze_conversation(messages)
    
    def _analyze_conversation(self, messages: List[MessageModel]) -> str:
        """
        Analyze conversation messages and generate a summary.
        
        This is a template-based approach that extracts:
        - Number of exchanges
        - Topic themes (greetings, questions, reflections)
        - User emotional tone patterns
        
        Args:
            messages: List of Message objects
            
        Returns:
            Summary string describing the session
        """
        if not messages:
            return "Empty session - no conversation occurred."
        
        # Count exchanges
        user_messages = [m for m in messages if m.role == "user"]
        assistant_messages = [m for m in messages if m.role == "assistant"]
        
        total_exchanges = len(user_messages)
        
        if total_exchanges == 0:
            return "Session started but no user messages were recorded."
        
        # Analyze first and last messages
        first_user_msg = user_messages[0].content if user_messages else ""
        last_user_msg = user_messages[-1].content if user_messages else ""
        
        # Detect topic indicators
        has_greeting = any(word in first_user_msg.lower() for word in ["hello", "hi", "hey", "good"])
        has_question = "?" in " ".join(m.content for m in user_messages)
        has_reflection = any(word in " ".join(m.content.lower() for m in messages) 
                           for word in ["feel", "think", "feelings", "emotion", "stress", "anxiety", "worry"])
        
        # Build summary
        summary_parts = []
        
        # Opening
        if has_greeting:
            summary_parts.append("Greeting exchange occurred.")
        
        # Exchange count
        summary_parts.append(f"{total_exchanges} user message{'s' if total_exchanges != 1 else ''} recorded.")
        
        # Content indicators
        if has_question:
            summary_parts.append("Questions about personal matters were discussed.")
        
        if has_reflection:
            summary_parts.append("The user engaged in self-reflection during this session.")
        
        # Closing sentiment based on last message
        closing_words = ["thank", "grateful", "appreciate", "helped", "better"]
        if any(word in last_user_msg.lower() for word in closing_words):
            summary_parts.append("User expressed gratitude at the end of the session.")
        
        # Add closing
        if assistant_messages:
            marcus_mentions = sum(1 for m in assistant_messages 
                                if any(word in m.content.lower() 
                                      for word in ["stoic", "wisdom", "virtue", "duty", "marcus"]))
            if marcus_mentions > 0:
                summary_parts.append(f"Marcus shared {marcus_mentions} Stoic principle{'s' if marcus_mentions != 1 else ''} during the session.")
        
        return " ".join(summary_parts) if summary_parts else "A meditation session with meaningful exchange."
    
    def generate_and_store_summary(self, db: DBSession, session_id: str, user_id: str) -> Optional[str]:
        """
        Generate a summary and store it in the session.
        
        This is the main entry point for the session-end flow.
        It generates the summary and updates the session record.
        
        Args:
            db: Database session
            session_id: ID of the session
            user_id: ID of the user (for authorization)
            
        Returns:
            Generated summary string, or None if session not found
        """
        summary = self.generate_summary(db, session_id, user_id)
        
        if summary is not None:
            session_service = SessionService()
            session_service.update_session(db, session_id, user_id, summary=summary)
        
        return summary


# Global instance
summary_service = SummaryService()
