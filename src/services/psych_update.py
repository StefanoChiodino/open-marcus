"""
PsychUpdate Service for generating psychological analysis after AI responses.

Analyzes user messages and AI responses to generate:
- Detected patterns: Behavioral/emotional patterns identified
- Emotional state: Estimated current emotional state of user
- Stoic principle applied: Which Stoic principle was referenced/applied
- Suggested direction: Recommended focus for next AI response
- Semantic assertions: Facts extracted about the user
"""

import logging
import re
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session as DBSession

from ..models.psych_update import PsychUpdate
from ..models.semantic_assertion import SemanticAssertion

logger = logging.getLogger(__name__)


# Emotional keywords mapping for heuristic analysis
EMOTIONAL_KEYWORDS = {
    "anxious": ["anxious", "worried", "nervous", "stressed", "panic", "fear", "scared", "afraid", "overwhelmed", "tense"],
    "sad": ["sad", "depressed", "down", "hopeless", "grief", "mourning", "unhappy", "disappointed", "hurt"],
    "angry": ["angry", "frustrated", "irritated", "annoyed", "rage", "furious", "mad", "resentful"],
    "calm": ["calm", "peaceful", "relaxed", "serene", "tranquil", "centered", "balanced", "content"],
    "confused": ["confused", "uncertain", "unsure", "lost", "don't know", "unclear", "puzzled", "bewildered"],
    "grateful": ["grateful", "thankful", "appreciate", "blessed", "fortunate", "thank"],
    "motivated": ["motivated", "inspired", "energized", "excited", "enthusiastic", "driven"],
    "lonely": ["lonely", "alone", "isolated", "disconnected", "unconnected", "solitary"],
    "guilty": ["guilty", "regret", "remorse", "ashamed", "blame", "should have", "would have"],
    "hopeful": ["hopeful", "optimistic", "looking forward", "anticipating", "trust"],
}

# Stoic principles mapping
STOIC_PRINCIPLES = {
    "amor_fati": ["amor fati", "love of fate", "embrace what happens", "accept fate"],
    "memento_mori": ["memento mori", "memento", "death", "mortality", "impermanence", "last day"],
    "dichotomy_of_control": ["dichotomy of control", "control what you can", "what's in your power", "accept what isn't"],
    "virtue": ["virtue", "wisdom", "courage", "justice", "temperance", "moral excellence"],
    "premeditatio_malorum": ["premeditatio malorum", "premeditation", "anticipate misfortune", "prepare for worst"],
    "negative_visualization": ["negative visualization", "imagine losing", "what could go wrong", "consider absence"],
    "inner_focus": ["inner focus", "inner", "internals", "inner citadel", "inner tranquility", "inner peace"],
    "present_moment": ["present moment", "now", "this moment", "here and now", "current", "immediate"],
    "detachment": ["detachment", "let go", "release", "unattached", "not cling", "non-attachment"],
    "rational_thinking": ["rational", "reason", "logic", "rationality", "objective", "logical"],
}

# Pattern categories for semantic assertions
PATTERN_CATEGORIES = {
    "goal": ["goal", "want to", "would like", "aim to", "plan to", "intend to", "desire to"],
    "belief": ["believe", "think that", "feel that", "opinion", "view", "perspective"],
    "preference": ["prefer", "like", "enjoy", "love", "hate", "dislike", "rather", "favorite"],
    "pattern": ["always", "never", "usually", "often", "sometimes", "rarely", "tend to", "keep on"],
    "struggle": ["struggle", "hard to", "difficult to", "can't", "unable to", "fail to", "problem with"],
}


class PsychUpdateService:
    """
    Service for generating psychological analysis after AI responses.
    
    Analyzes user messages and AI responses to create PsychUpdate records
    that track emotional patterns, applied Stoic principles, and suggested
    directions for future interactions.
    """
    
    def __init__(self):
        """Initialize the PsychUpdate service."""
        pass
    
    def analyze_emotional_state(self, text: str) -> Tuple[str, List[str]]:
        """
        Analyze text to estimate emotional state.
        
        Args:
            text: User's message text
            
        Returns:
            Tuple of (primary_emotional_state, detected_keywords)
        """
        text_lower = text.lower()
        detected: List[Tuple[str, int]] = []
        
        for emotion, keywords in EMOTIONAL_KEYWORDS.items():
            count = sum(1 for kw in keywords if kw in text_lower)
            if count > 0:
                detected.append((emotion, count))
        
        if not detected:
            return "neutral", []
        
        # Sort by count and return the primary emotion
        detected.sort(key=lambda x: x[1], reverse=True)
        primary = detected[0][0]
        
        # Collect matched keywords for context
        matched_keywords = []
        for emotion, keywords in EMOTIONAL_KEYWORDS.items():
            for kw in keywords:
                if kw in text_lower:
                    matched_keywords.append(kw)
        
        return primary, matched_keywords
    
    def detect_stoic_principles(self, text: str) -> List[str]:
        """
        Detect which Stoic principles are referenced in the text.
        
        Args:
            text: Text to analyze (user message or AI response)
            
        Returns:
            List of detected Stoic principle identifiers
        """
        text_lower = text.lower()
        detected = []
        
        for principle, keywords in STOIC_PRINCIPLES.items():
            for kw in keywords:
                if kw in text_lower:
                    detected.append(principle)
                    break
        
        return detected
    
    def extract_patterns(self, text: str) -> List[str]:
        """
        Extract behavioral patterns from text.
        
        Args:
            text: User's message text
            
        Returns:
            List of detected pattern descriptions
        """
        text_lower = text.lower()
        patterns = []
        
        for category, keywords in PATTERN_CATEGORIES.items():
            for kw in keywords:
                if kw in text_lower:
                    # Create a description of the pattern
                    pattern = self._create_pattern_description(text_lower, kw, category)
                    if pattern:
                        patterns.append(pattern)
                    break
        
        return patterns
    
    def _create_pattern_description(self, text: str, keyword: str, category: str) -> Optional[str]:
        """Create a pattern description from matched keyword."""
        # Find the sentence containing the keyword
        sentences = re.split(r'[.!?]', text)
        for sentence in sentences:
            if keyword in sentence:
                sentence = sentence.strip()
                if len(sentence) > 10 and len(sentence) < 200:
                    return f"{category}: {sentence}"
        return None
    
    def suggest_direction(self, emotional_state: str, detected_patterns: List[str], ai_response: str) -> Optional[str]:
        """
        Suggest a direction for the next AI response based on analysis.
        
        Args:
            emotional_state: Detected emotional state
            detected_patterns: List of detected patterns
            ai_response: The AI's response text
            
        Returns:
            Suggested direction for next interaction
        """
        # Suggest directions based on emotional state
        direction_map = {
            "anxious": "Continue providing reassurance and grounding techniques. Focus on breathing and present moment.",
            "sad": "Offer gentle comfort and validate emotions without trying to fix. Encourage self-compassion.",
            "angry": "Help user process frustration without judgment. Guide toward understanding root cause.",
            "confused": "Provide clarity and simplicity. Break down concepts into smaller, manageable parts.",
            "grateful": "Acknowledge and reinforce positive emotions. Explore what brings them gratitude.",
            "motivated": "Channel energy into productive reflection. Encourage setting intentions.",
            "lonely": "Validate feelings and remind user of connection. Explore sources of meaningful relationships.",
            "guilty": "Help user practice self-forgiveness. Guide toward learning rather than self-punishment.",
            "hopeful": "Support optimism while staying grounded. Encourage realistic steps forward.",
            "calm": "Deepen the peaceful state. Explore what contributes to their calm.",
        }
        
        # Check if AI response already addressed the emotional state
        suggested = direction_map.get(emotional_state)
        
        if detected_patterns:
            # Add pattern-specific guidance
            pattern_hints = []
            for pattern in detected_patterns[:2]:  # Limit to first 2 patterns
                if "struggle" in pattern:
                    pattern_hints.append("Address the ongoing struggle with compassionate framing.")
                elif "goal" in pattern:
                    pattern_hints.append("Explore progress toward their stated goal.")
                elif "pattern" in pattern:
                    pattern_hints.append("Help them see patterns from a broader perspective.")
            
            if pattern_hints and suggested:
                suggested = suggested + " " + " ".join(pattern_hints)
        
        return suggested
    
    def create_semantic_assertions(
        self,
        db: DBSession,
        user_id: str,
        message_id: str,
        psych_update_id: str,
        user_message: str,
        ai_response: str,
    ) -> List[SemanticAssertion]:
        """
        Extract and store semantic assertions from the conversation.
        
        Args:
            db: Database session
            user_id: User ID
            message_id: ID of the user message
            psych_update_id: ID of the parent PsychUpdate
            user_message: User's message text
            ai_response: AI's response text
            
        Returns:
            List of created SemanticAssertion objects
        """
        assertions = []
        text_lower = user_message.lower()
        
        # Extract goal-related assertions
        for kw in ["want to", "would like", "aim to", "plan to", "intend to", "desire to"]:
            if kw in text_lower:
                # Find the sentence
                sentences = re.split(r'[.!?]', user_message)
                for sentence in sentences:
                    if kw in sentence.lower():
                        assertion = SemanticAssertion(
                            user_id=user_id,
                            source_message_id=message_id,
                            psych_update_id=psych_update_id,
                            text=sentence.strip(),
                            confidence=0.6,
                            category="goal"
                        )
                        db.add(assertion)
                        assertions.append(assertion)
                        break
        
        # Extract preference-related assertions
        for kw in ["prefer", "like to", "enjoy", "love to", "rather"]:
            if kw in text_lower:
                sentences = re.split(r'[.!?]', user_message)
                for sentence in sentences:
                    if kw in sentence.lower():
                        assertion = SemanticAssertion(
                            user_id=user_id,
                            source_message_id=message_id,
                            psych_update_id=psych_update_id,
                            text=sentence.strip(),
                            confidence=0.5,
                            category="preference"
                        )
                        db.add(assertion)
                        assertions.append(assertion)
                        break
        
        # Extract pattern-related assertions
        for kw in ["always", "never", "usually", "often", "sometimes", "rarely"]:
            if kw in text_lower:
                sentences = re.split(r'[.!?]', user_message)
                for sentence in sentences:
                    if kw in sentence.lower():
                        assertion = SemanticAssertion(
                            user_id=user_id,
                            source_message_id=message_id,
                            psych_update_id=psych_update_id,
                            text=sentence.strip(),
                            confidence=0.5,
                            category="pattern"
                        )
                        db.add(assertion)
                        assertions.append(assertion)
                        break
        
        return assertions
    
    def generate_psych_update(
        self,
        db: DBSession,
        user_id: str,
        message_id: str,
        user_message: str,
        ai_response: str,
    ) -> PsychUpdate:
        """
        Generate a complete PsychUpdate after an AI response.
        
        Args:
            db: Database session
            user_id: User ID
            message_id: ID of the user message that prompted the AI response
            user_message: User's message text
            ai_response: AI's response text
            
        Returns:
            Created PsychUpdate object
        """
        # Analyze user message
        emotional_state, emotional_keywords = self.analyze_emotional_state(user_message)
        
        # Detect Stoic principles in AI response (since that's what Marcus would apply)
        stoic_principles = self.detect_stoic_principles(ai_response)
        stoic_principle_applied = stoic_principles[0] if stoic_principles else None
        
        # Extract patterns from user message
        patterns = self.extract_patterns(user_message)
        
        # Add emotional keywords as patterns if significant
        if emotional_keywords:
            patterns.append(f"emotional indicators: {', '.join(emotional_keywords[:3])}")
        
        # Suggest direction
        suggested_direction = self.suggest_direction(emotional_state, patterns, ai_response)
        
        # Calculate confidence based on detection quality
        confidence = 0.5
        if emotional_keywords:
            confidence += 0.1 * min(len(emotional_keywords), 3)
        if stoic_principles:
            confidence += 0.15
        if patterns:
            confidence += 0.1 * min(len(patterns), 3)
        confidence = min(confidence, 0.95)  # Cap at 0.95
        
        # Create PsychUpdate record
        psych_update = PsychUpdate(
            message_id=message_id,
            detected_patterns=patterns,
            emotional_state=emotional_state,
            stoic_principle_applied=stoic_principle_applied,
            suggested_direction=suggested_direction,
            confidence=confidence,
        )
        
        db.add(psych_update)
        db.flush()  # Get the ID without committing
        
        # Create semantic assertions
        self.create_semantic_assertions(
            db=db,
            user_id=user_id,
            message_id=message_id,
            psych_update_id=psych_update.id,
            user_message=user_message,
            ai_response=ai_response,
        )
        
        logger.info(
            f"Created PsychUpdate for message {message_id}: "
            f"emotional_state={emotional_state}, "
            f"stoic_principle={stoic_principle_applied}, "
            f"confidence={confidence}"
        )
        
        return psych_update


# Global instance
psych_update_service = PsychUpdateService()


def get_psych_update_service() -> PsychUpdateService:
    """Get the global psych update service instance."""
    return psych_update_service
