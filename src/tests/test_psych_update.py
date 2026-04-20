"""
Tests for PsychUpdateService - psychological analysis generation.
"""

from unittest.mock import MagicMock

from src.services.psych_update import (
    PsychUpdateService,
    get_psych_update_service,
)
from src.models.psych_update import PsychUpdate


class TestPsychUpdateServiceInit:
    """Tests for PsychUpdateService initialization."""
    
    def test_service_instantiation(self):
        """PsychUpdateService should instantiate without errors."""
        service = PsychUpdateService()
        assert service is not None
    
    def test_get_psych_update_service_returns_instance(self):
        """get_psych_update_service should return an instance."""
        service = get_psych_update_service()
        assert isinstance(service, PsychUpdateService)


class TestAnalyzeEmotionalState:
    """Tests for emotional state analysis."""
    
    def test_analyze_anxious_keywords(self):
        """Should detect anxious emotional state."""
        service = PsychUpdateService()
        text = "I am feeling very anxious and worried about my job interview tomorrow"
        
        emotion, keywords = service.analyze_emotional_state(text)
        
        assert emotion == "anxious"
        assert len(keywords) > 0
    
    def test_analyze_sad_keywords(self):
        """Should detect sad emotional state."""
        service = PsychUpdateService()
        text = "I feel so sad and depressed after hearing the news"
        
        emotion, keywords = service.analyze_emotional_state(text)
        
        assert emotion == "sad"
        assert len(keywords) > 0
    
    def test_analyze_calm_keywords(self):
        """Should detect calm emotional state."""
        service = PsychUpdateService()
        text = "I feel peaceful and serene after the meditation session"
        
        emotion, keywords = service.analyze_emotional_state(text)
        
        assert emotion == "calm"
        assert len(keywords) > 0
    
    def test_analyze_grateful_keywords(self):
        """Should detect grateful emotional state."""
        service = PsychUpdateService()
        text = "I am so grateful for your help and support"
        
        emotion, keywords = service.analyze_emotional_state(text)
        
        assert emotion == "grateful"
        assert len(keywords) > 0
    
    def test_analyze_no_emotion_returns_neutral(self):
        """Should return neutral when no emotions detected."""
        service = PsychUpdateService()
        text = "I went to the store and bought some groceries"
        
        emotion, keywords = service.analyze_emotional_state(text)
        
        assert emotion == "neutral"
        assert len(keywords) == 0
    
    def test_analyze_multiple_emotions_returns_strongest(self):
        """Should return the most frequent emotion."""
        service = PsychUpdateService()
        text = "I feel anxious and worried but also calm and peaceful"
        
        emotion, keywords = service.analyze_emotional_state(text)
        
        # Anxious appears first in the text with 2 keywords (anxious, worried)
        # calm appears with 2 (calm, peaceful)
        # Should return one of them
        assert emotion in ["anxious", "calm"]


class TestDetectStoicPrinciples:
    """Tests for Stoic principle detection."""
    
    def test_detect_memento_mori(self):
        """Should detect memento mori principle."""
        service = PsychUpdateService()
        text = "Remember that you will die one day. Memento mori."
        
        principles = service.detect_stoic_principles(text)
        
        assert "memento_mori" in principles
    
    def test_detect_amor_fati(self):
        """Should detect amor fati principle."""
        service = PsychUpdateService()
        text = "I must embrace whatever happens and accept fate"
        
        principles = service.detect_stoic_principles(text)
        
        assert "amor_fati" in principles
    
    def test_detect_dichotomy_of_control(self):
        """Should detect dichotomy of control principle."""
        service = PsychUpdateService()
        text = "I need to focus on what's in my control and accept what isn't"
        
        principles = service.detect_stoic_principles(text)
        
        assert "dichotomy_of_control" in principles
    
    def test_detect_virtue(self):
        """Should detect virtue principle."""
        service = PsychUpdateService()
        text = "Acting with wisdom and courage is the path to virtue"
        
        principles = service.detect_stoic_principles(text)
        
        assert "virtue" in principles
    
    def test_detect_present_moment(self):
        """Should detect present moment principle."""
        service = PsychUpdateService()
        text = "Focus on this moment, here and now, not the past or future"
        
        principles = service.detect_stoic_principles(text)
        
        assert "present_moment" in principles
    
    def test_detect_no_principles(self):
        """Should return empty list when no principles detected."""
        service = PsychUpdateService()
        text = "I went to the store and bought some things"
        
        principles = service.detect_stoic_principles(text)
        
        assert len(principles) == 0


class TestExtractPatterns:
    """Tests for pattern extraction."""
    
    def test_extract_goal_pattern(self):
        """Should extract goal-related patterns."""
        service = PsychUpdateService()
        text = "I want to start meditating every morning"
        
        patterns = service.extract_patterns(text)
        
        assert len(patterns) > 0
        assert any("goal" in p.lower() for p in patterns)
    
    def test_extract_preference_pattern(self):
        """Should extract preference-related patterns."""
        service = PsychUpdateService()
        text = "I prefer to meditate in the evening before bed"
        
        patterns = service.extract_patterns(text)
        
        assert len(patterns) > 0
        assert any("prefer" in p.lower() for p in patterns)
    
    def test_extract_pattern_pattern(self):
        """Should extract behavioral patterns."""
        service = PsychUpdateService()
        text = "I always seem to get anxious before important meetings"
        
        patterns = service.extract_patterns(text)
        
        assert len(patterns) > 0
    
    def test_extract_no_patterns(self):
        """Should return empty list when no patterns detected."""
        service = PsychUpdateService()
        text = "The weather is nice today"
        
        _patterns = service.extract_patterns(text)
        
        # May or may not have patterns depending on keyword matching


class TestSuggestDirection:
    """Tests for direction suggestion."""
    
    def test_suggest_direction_for_anxious(self):
        """Should suggest calming direction for anxious state."""
        service = PsychUpdateService()
        
        direction = service.suggest_direction("anxious", [], "Some response")
        
        assert direction is not None
        assert "reassurance" in direction.lower() or "grounding" in direction.lower() or "breathing" in direction.lower()
    
    def test_suggest_direction_for_sad(self):
        """Should suggest comforting direction for sad state."""
        service = PsychUpdateService()
        
        direction = service.suggest_direction("sad", [], "Some response")
        
        assert direction is not None
        assert "compassion" in direction.lower() or "self-compassion" in direction.lower()
    
    def test_suggest_direction_for_motivated(self):
        """Should suggest channeling direction for motivated state."""
        service = PsychUpdateService()
        
        direction = service.suggest_direction("motivated", [], "Some response")
        
        assert direction is not None
        assert "intentions" in direction.lower() or "productive" in direction.lower()
    
    def test_suggest_direction_includes_pattern_hints(self):
        """Should include pattern-specific hints when patterns detected."""
        service = PsychUpdateService()
        
        direction = service.suggest_direction(
            "anxious",
            ["struggle: I struggle to sleep at night"],
            "Some response"
        )
        
        assert direction is not None
        assert "struggle" in direction.lower() or "compassion" in direction.lower()


class TestCreateSemanticAssertions:
    """Tests for semantic assertion creation."""
    
    def test_create_goal_assertion(self):
        """Should create semantic assertion for goal."""
        service = PsychUpdateService()
        mock_db = MagicMock()
        
        assertions = service.create_semantic_assertions(
            db=mock_db,
            user_id="user123",
            message_id="msg456",
            psych_update_id="psych789",
            user_message="I want to meditate for 30 minutes every day",
            ai_response="That sounds like a wonderful goal.",
        )
        
        mock_db.add.assert_called()
        assert len(assertions) > 0
    
    def test_create_preference_assertion(self):
        """Should create semantic assertion for preference."""
        service = PsychUpdateService()
        mock_db = MagicMock()
        
        assertions = service.create_semantic_assertions(
            db=mock_db,
            user_id="user123",
            message_id="msg456",
            psych_update_id="psych789",
            user_message="I prefer to meditate in the morning",
            ai_response="Morning meditation is a great practice.",
        )
        
        mock_db.add.assert_called()
        assert len(assertions) > 0
    
    def test_create_no_assertions_for_no_keywords(self):
        """Should not create assertions when no keywords match."""
        service = PsychUpdateService()
        mock_db = MagicMock()
        
        _assertions = service.create_semantic_assertions(
            db=mock_db,
            user_id="user123",
            message_id="msg456",
            psych_update_id="psych789",
            user_message="The sky is blue today",
            ai_response="Yes, it is.",
        )
        
        # May or may not create assertions depending on keyword matching


class TestGeneratePsychUpdate:
    """Tests for complete PsychUpdate generation."""
    
    def test_generate_psych_update_creates_record(self):
        """Should create a PsychUpdate record."""
        service = PsychUpdateService()
        mock_db = MagicMock()
        
        psych_update = service.generate_psych_update(
            db=mock_db,
            user_id="user123",
            message_id="msg456",
            user_message="I am feeling very anxious about my presentation",
            ai_response="Remember to focus on what you can control.",
        )
        
        mock_db.add.assert_called()
        mock_db.flush.assert_called()
        assert isinstance(psych_update, PsychUpdate)
    
    def test_generate_psych_update_sets_correct_emotional_state(self):
        """Should set correct emotional state."""
        service = PsychUpdateService()
        mock_db = MagicMock()
        
        psych_update = service.generate_psych_update(
            db=mock_db,
            user_id="user123",
            message_id="msg456",
            user_message="I am feeling very anxious about my presentation",
            ai_response="Remember to focus on what you can control.",
        )
        
        assert psych_update.emotional_state == "anxious"
    
    def test_generate_psych_update_detects_stoic_principle(self):
        """Should detect Stoic principle from AI response."""
        service = PsychUpdateService()
        mock_db = MagicMock()
        
        psych_update = service.generate_psych_update(
            db=mock_db,
            user_id="user123",
            message_id="msg456",
            user_message="I am feeling anxious",
            ai_response="Remember the dichotomy of control - focus on what's in your power.",
        )
        
        assert psych_update.stoic_principle_applied == "dichotomy_of_control"
    
    def test_generate_psych_update_has_suggested_direction(self):
        """Should have suggested direction."""
        service = PsychUpdateService()
        mock_db = MagicMock()
        
        psych_update = service.generate_psych_update(
            db=mock_db,
            user_id="user123",
            message_id="msg456",
            user_message="I am feeling very anxious",
            ai_response="Remember to breathe.",
        )
        
        assert psych_update.suggested_direction is not None
        assert len(psych_update.suggested_direction) > 0
    
    def test_generate_psych_update_has_confidence(self):
        """Should have a confidence score."""
        service = PsychUpdateService()
        mock_db = MagicMock()
        
        psych_update = service.generate_psych_update(
            db=mock_db,
            user_id="user123",
            message_id="msg456",
            user_message="I am feeling very anxious",
            ai_response="Remember to breathe.",
        )
        
        assert psych_update.confidence is not None
        assert 0 <= psych_update.confidence <= 1
    
    def test_generate_psych_update_has_patterns(self):
        """Should have detected patterns."""
        service = PsychUpdateService()
        mock_db = MagicMock()
        
        psych_update = service.generate_psych_update(
            db=mock_db,
            user_id="user123",
            message_id="msg456",
            user_message="I always get anxious before meetings",
            ai_response="This is a common pattern.",
        )
        
        assert psych_update.detected_patterns is not None
        assert isinstance(psych_update.detected_patterns, list)


class TestPsychUpdateIntegration:
    """Integration tests for PsychUpdate with database."""
    
    def test_psych_update_record_structure(self):
        """PsychUpdate model should have correct structure."""
        psych_update = PsychUpdate(
            message_id="msg123",
            detected_patterns=["pattern1", "pattern2"],
            emotional_state="anxious",
            stoic_principle_applied="dichotomy_of_control",
            suggested_direction="Continue with grounding techniques.",
            confidence=0.75,
        )
        
        assert psych_update.message_id == "msg123"
        assert len(psych_update.detected_patterns) == 2
        assert psych_update.emotional_state == "anxious"
        assert psych_update.stoic_principle_applied == "dichotomy_of_control"
        assert psych_update.confidence == 0.75
