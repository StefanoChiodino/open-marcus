"""
Persona Service for Marcus Aurelius Stoic Meditation Companion.

Builds dynamic system prompts that establish Marcus Aurelius as a stoic
philosopher and meditation companion. The persona incorporates user
profile information, past session insights, and accumulated memories
to create a personalized experience.
"""

import logging
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy.orm import Session as DBSession

from ..models.profile import Profile
from ..models.semantic_assertion import SemanticAssertion
from ..models.psych_update import PsychUpdate
from ..services.llm import ChatMessage

if TYPE_CHECKING:
    from ..models.message import Message as MessageModel

logger = logging.getLogger(__name__)


# Base system prompt for Marcus Aurelius - establishes stoic philosopher character
MARCUS_BASE_PROMPT = """You are Marcus Aurelius, Roman Emperor and Stoic philosopher. You are speaking as a meditation companion to help the user with their mental well-being journey.

Your character:
- You are wise, calm, and compassionate
- You speak in the manner of a thoughtful counselor, not a teacher
- You reference Stoic principles when relevant (Amor Fati, Memento Mori, Dichotomy of Control, Virtue)
- You ask thoughtful questions to help users reflect on their thoughts and emotions
- You are warm but not overly familiar
- You help users see their problems from a broader perspective

Guidelines:
- Keep responses conversational and not too long (2-4 sentences typically)
- Acknowledge what the user shares before offering perspective
- When appropriate, gently guide toward Stoic reflections
- Never judge, only help the user understand themselves
- Focus on the present moment and what they can control

Remember: You are a companion on their mental journey, not a therapist. Help them find their own wisdom within."""


class PersonaService:
    """
    Service for building Marcus Aurelius persona prompts.
    
    The persona evolves over time by incorporating:
    - User's profile (name, goals, experience level)
    - Accumulated semantic assertions about the user
    - Emotional patterns from psych_updates
    - Insights from past sessions
    
    This creates a personalized meditation companion that
    maintains consistency with stoic philosophy.
    """
    
    def __init__(self):
        """Initialize the persona service."""
        pass
    
    def get_user_profile(self, db: DBSession, user_id: str) -> Optional[Profile]:
        """
        Get user's profile.
        
        Args:
            db: Database session
            user_id: User ID
            
        Returns:
            Profile object if found, None otherwise
        """
        return db.query(Profile).filter(Profile.user_id == user_id).first()
    
    def get_recent_assertions(
        self, db: DBSession, user_id: str, limit: int = 5
    ) -> List[SemanticAssertion]:
        """
        Get recent semantic assertions for the user.
        
        Args:
            db: Database session
            user_id: User ID
            limit: Maximum number of assertions to return
            
        Returns:
            List of SemanticAssertion objects
        """
        return db.query(SemanticAssertion).filter(
            SemanticAssertion.user_id == user_id
        ).order_by(
            SemanticAssertion.created_at.desc()
        ).limit(limit).all()
    
    def get_emotional_history(
        self, db: DBSession, user_id: str, limit: int = 5
    ) -> List[PsychUpdate]:
        """
        Get recent emotional state history for the user.
        
        Args:
            db: Database session
            user_id: User ID
            limit: Maximum number of records to return
            
        Returns:
            List of PsychUpdate objects
        """
        return db.query(PsychUpdate).join(SemanticAssertion).filter(
            SemanticAssertion.user_id == user_id
        ).order_by(
            PsychUpdate.created_at.desc()
        ).limit(limit).all()
    
    def get_session_count(self, db: DBSession, user_id: str) -> int:
        """
        Get the total number of completed sessions for the user.
        
        Args:
            db: Database session
            user_id: User ID
            
        Returns:
            Number of concluded sessions
        """
        from ..models.session import Session as SessionModel
        return db.query(SessionModel).filter(
            SessionModel.user_id == user_id,
            SessionModel.state == "concluded"
        ).count()
    
    def _format_profile_context(self, profile: Profile, session_count: int) -> str:
        """
        Format user profile into a context string for the prompt.
        
        Args:
            profile: User's profile
            session_count: Number of completed sessions
            
        Returns:
            Formatted context string
        """
        context_parts = []
        
        # User's name
        context_parts.append(f"The user's name is {profile.name}.")
        
        # Experience level
        level = profile.experience_level
        if level:
            context_parts.append(f"They describe their meditation experience as '{level}'.")
        
        # Meditation goals
        if profile.goals:
            context_parts.append(f"Their meditation goals are: {profile.goals}")
        
        # Session history
        if session_count > 0:
            context_parts.append(
                f"This is not their first session - they have had {session_count} "
                f"meditation session{'s' if session_count != 1 else ''} before."
            )
        else:
            context_parts.append("This appears to be their first meditation session.")
        
        return " ".join(context_parts)
    
    def _format_insights_context(
        self, assertions: List[SemanticAssertion]
    ) -> str:
        """
        Format semantic assertions into insights context.
        
        Args:
            assertions: List of semantic assertions
            
        Returns:
            Formatted insights context string
        """
        if not assertions:
            return ""
        
        insights = []
        for assertion in assertions:
            if assertion.category and assertion.text:
                insights.append(f"- {assertion.text} ({assertion.category})")
            elif assertion.text:
                insights.append(f"- {assertion.text}")
        
        if not insights:
            return ""
        
        return "\nWhat I know about this person:\n" + "\n".join(insights)
    
    def _format_emotional_context(
        self, psych_updates: List[PsychUpdate]
    ) -> str:
        """
        Format emotional state patterns into context.
        
        Args:
            psych_updates: List of psych updates
            
        Returns:
            Formatted emotional context string
        """
        if not psych_updates:
            return ""
        
        # Get emotional states
        emotional_states = [p.emotional_state for p in psych_updates if p.emotional_state]
        
        if not emotional_states:
            return ""
        
        # Count occurrences
        from collections import Counter
        state_counts = Counter(emotional_states)
        most_common = state_counts.most_common(3)
        
        patterns = []
        for state, count in most_common:
            if count > 1:
                patterns.append(f"{state} (observed {count} times)")
            else:
                patterns.append(state)
        
        if patterns:
            return f"\nRecent emotional patterns: {', '.join(patterns)}"
        
        return ""
    
    def build_system_prompt(
        self,
        db: DBSession,
        user_id: str,
        include_profile: bool = True,
        include_insights: bool = True,
        include_emotional: bool = True,
    ) -> str:
        """
        Build the complete system prompt with persona and user context.
        
        Args:
            db: Database session
            user_id: User ID
            include_profile: Include user profile in prompt
            include_insights: Include semantic assertions in prompt
            include_emotional: Include emotional patterns in prompt
            
        Returns:
            Complete system prompt string
        """
        prompt_parts = [MARCUS_BASE_PROMPT]
        
        if include_profile:
            profile = self.get_user_profile(db, user_id)
            if profile:
                session_count = self.get_session_count(db, user_id)
                profile_context = self._format_profile_context(profile, session_count)
                prompt_parts.append(f"\n\nUser Context:\n{profile_context}")
        
        if include_insights:
            assertions = self.get_recent_assertions(db, user_id, limit=5)
            if assertions:
                insights_context = self._format_insights_context(assertions)
                prompt_parts.append(insights_context)
        
        if include_emotional:
            psych_updates = self.get_emotional_history(db, user_id, limit=5)
            if psych_updates:
                emotional_context = self._format_emotional_context(psych_updates)
                prompt_parts.append(emotional_context)
        
        return "\n".join(prompt_parts)
    
    def build_chat_messages_with_persona(
        self,
        db: DBSession,
        user_id: str,
        conversation_history: List["MessageModel"],  # Message models
        new_user_message: Optional[str] = None,
    ) -> List[ChatMessage]:
        """
        Build complete chat message list including system prompt with persona.
        
        Args:
            db: Database session
            user_id: User ID
            conversation_history: List of previous messages in the session
            new_user_message: Optional new user message to append
            
        Returns:
            List of ChatMessage objects ready for LLM
        """
        # Build system prompt with persona
        system_prompt = self.build_system_prompt(
            db, user_id,
            include_profile=True,
            include_insights=True,
            include_emotional=True,
        )
        
        messages = [ChatMessage(role="system", content=system_prompt)]
        
        # Add conversation history
        for msg in conversation_history:
            messages.append(ChatMessage(role=msg.role, content=msg.content))
        
        # Add new user message if provided
        if new_user_message:
            messages.append(ChatMessage(role="user", content=new_user_message))
        
        return messages
    
    def get_persona_description(self) -> str:
        """
        Get a brief description of the persona for display purposes.
        
        Returns:
            Description string
        """
        return (
            "Marcus Aurelius - Roman Emperor and Stoic philosopher. "
            "Your meditation companion on the path to self-understanding."
        )


# Global instance
persona_service = PersonaService()


def get_persona_service() -> PersonaService:
    """Get the global persona service instance."""
    return persona_service
