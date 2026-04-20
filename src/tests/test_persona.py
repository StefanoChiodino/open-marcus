"""
Tests for PersonaService - Marcus Aurelius persona system.
"""

from unittest.mock import MagicMock

from src.services.persona import (
    PersonaService,
    MARCUS_BASE_PROMPT,
    get_persona_service,
)
from src.models.profile import Profile
from src.models.semantic_assertion import SemanticAssertion
from src.models.psych_update import PsychUpdate


class TestMarcusBasePrompt:
    """Tests for the base Marcus Aurelius system prompt."""
    
    def test_marcus_base_prompt_exists(self):
        """Base prompt should exist and be non-empty."""
        assert MARCUS_BASE_PROMPT is not None
        assert len(MARCUS_BASE_PROMPT) > 0
    
    def test_marcus_base_prompt_mentions_stoic(self):
        """Prompt should mention Stoic philosophy."""
        assert "Stoic" in MARCUS_BASE_PROMPT or "stoic" in MARCUS_BASE_PROMPT.lower()
    
    def test_marcus_base_prompt_mentions_meditation(self):
        """Prompt should mention meditation companion."""
        assert "meditation" in MARCUS_BASE_PROMPT.lower()
    
    def test_marcus_base_prompt_mentions_marcus_aurelius(self):
        """Prompt should mention Marcus Aurelius."""
        assert "Marcus Aurelius" in MARCUS_BASE_PROMPT


class TestPersonaServiceInit:
    """Tests for PersonaService initialization."""
    
    def test_persona_service_instantiation(self):
        """PersonaService should instantiate without errors."""
        service = PersonaService()
        assert service is not None
    
    def test_get_persona_service_returns_instance(self):
        """get_persona_service should return an instance."""
        service = get_persona_service()
        assert isinstance(service, PersonaService)


class TestPersonaServiceProfileContext:
    """Tests for profile context building."""
    
    def test_format_profile_context_with_name(self):
        """Should format user name in context."""
        service = PersonaService()
        profile = MagicMock(spec=Profile)
        profile.name = "John"
        profile.experience_level = "beginner"
        profile.goals = "Reduce stress"
        
        context = service._format_profile_context(profile, session_count=0)
        
        assert "John" in context
        assert "first" in context
    
    def test_format_profile_context_with_session_count(self):
        """Should format session count in context."""
        service = PersonaService()
        profile = MagicMock(spec=Profile)
        profile.name = "John"
        profile.experience_level = "beginner"
        profile.goals = "Reduce stress"
        
        context = service._format_profile_context(profile, session_count=5)
        
        assert "5" in context
        assert "meditation sessions" in context
    
    def test_format_profile_context_first_session(self):
        """Should indicate first session."""
        service = PersonaService()
        profile = MagicMock(spec=Profile)
        profile.name = "John"
        profile.experience_level = "beginner"
        profile.goals = "Reduce stress"
        
        context = service._format_profile_context(profile, session_count=0)
        
        assert "first meditation session" in context


class TestPersonaServiceInsightsContext:
    """Tests for insights context building."""
    
    def test_format_insights_context_empty(self):
        """Should return empty string for no assertions."""
        service = PersonaService()
        context = service._format_insights_context([])
        assert context == ""
    
    def test_format_insights_context_with_assertions(self):
        """Should format assertions with category."""
        service = PersonaService()
        
        assertion1 = MagicMock(spec=SemanticAssertion)
        assertion1.text = "User is stressed about work"
        assertion1.category = "pattern"
        
        assertion2 = MagicMock(spec=SemanticAssertion)
        assertion2.text = "User prefers morning meditation"
        assertion2.category = "preference"
        
        context = service._format_insights_context([assertion1, assertion2])
        
        assert "What I know about this person" in context
        assert "stressed about work" in context
        assert "pattern" in context
    
    def test_format_insights_context_without_category(self):
        """Should format assertions without category."""
        service = PersonaService()
        
        assertion = MagicMock(spec=SemanticAssertion)
        assertion.text = "Some insight"
        assertion.category = None
        
        context = service._format_insights_context([assertion])
        
        assert "Some insight" in context


class TestPersonaServiceEmotionalContext:
    """Tests for emotional context building."""
    
    def test_format_emotional_context_empty(self):
        """Should return empty string for no psych updates."""
        service = PersonaService()
        context = service._format_emotional_context([])
        assert context == ""
    
    def test_format_emotional_context_with_states(self):
        """Should format emotional states."""
        service = PersonaService()
        
        psych1 = MagicMock(spec=PsychUpdate)
        psych1.emotional_state = "anxious"
        
        psych2 = MagicMock(spec=PsychUpdate)
        psych2.emotional_state = "anxious"
        
        psych3 = MagicMock(spec=PsychUpdate)
        psych3.emotional_state = "calm"
        
        context = service._format_emotional_context([psych1, psych2, psych3])
        
        assert "anxious" in context
        assert "Recent emotional patterns" in context


class TestBuildSystemPrompt:
    """Tests for complete system prompt building."""
    
    def test_build_system_prompt_includes_base(self):
        """Should include base Marcus prompt."""
        service = PersonaService()
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        mock_db.query.return_value.join.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        mock_db.query.return_value.filter.return_value.count.return_value = 0
        
        prompt = service.build_system_prompt(mock_db, "user123")
        
        assert "Marcus Aurelius" in prompt
        assert "Stoic" in prompt
    
    def test_build_system_prompt_includes_user_context(self):
        """Should include user context when profile exists."""
        service = PersonaService()
        mock_db = MagicMock()
        
        mock_profile = MagicMock(spec=Profile)
        mock_profile.name = "Alice"
        mock_profile.experience_level = "intermediate"
        mock_profile.goals = "Find inner peace"
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_profile
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        mock_db.query.return_value.join.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        mock_db.query.return_value.filter.return_value.count.return_value = 3
        
        prompt = service.build_system_prompt(mock_db, "user123")
        
        assert "Alice" in prompt
        assert "intermediate" in prompt
    
    def test_build_system_prompt_excludes_profile_when_empty(self):
        """Should handle missing profile gracefully."""
        service = PersonaService()
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        mock_db.query.return_value.join.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        mock_db.query.return_value.filter.return_value.count.return_value = 0
        
        prompt = service.build_system_prompt(mock_db, "user123", include_profile=True)
        
        # Should not raise and should still include base prompt
        assert "Marcus Aurelius" in prompt


class TestBuildChatMessagesWithPersona:
    """Tests for building chat messages with persona."""
    
    def test_includes_system_message(self):
        """Should include system message with persona."""
        service = PersonaService()
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        mock_db.query.return_value.join.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        mock_db.query.return_value.filter.return_value.count.return_value = 0
        
        messages = service.build_chat_messages_with_persona(
            mock_db, "user123", [], "Hello"
        )
        
        assert len(messages) >= 1
        assert messages[0].role == "system"
        assert "Marcus Aurelius" in messages[0].content
    
    def test_includes_new_user_message(self):
        """Should include new user message."""
        service = PersonaService()
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        mock_db.query.return_value.join.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        mock_db.query.return_value.filter.return_value.count.return_value = 0
        
        messages = service.build_chat_messages_with_persona(
            mock_db, "user123", [], "Hello Marcus"
        )
        
        user_messages = [m for m in messages if m.role == "user"]
        assert len(user_messages) >= 1
        assert "Hello Marcus" in [m.content for m in user_messages]
    
    def test_includes_conversation_history(self):
        """Should include conversation history."""
        service = PersonaService()
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        mock_db.query.return_value.join.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        mock_db.query.return_value.filter.return_value.count.return_value = 0
        
        history = []
        mock_msg = MagicMock()
        mock_msg.role = "user"
        mock_msg.content = "Previous message"
        history.append(mock_msg)
        
        messages = service.build_chat_messages_with_persona(
            mock_db, "user123", history, "New message"
        )
        
        contents = [m.content for m in messages]
        assert "Previous message" in contents
        assert "New message" in contents


class TestGetPersonaDescription:
    """Tests for persona description."""
    
    def test_get_persona_description_returns_string(self):
        """Should return a description string."""
        service = PersonaService()
        desc = service.get_persona_description()
        
        assert isinstance(desc, str)
        assert len(desc) > 0
        assert "Marcus Aurelius" in desc


class TestGetUserProfile:
    """Tests for getting user profile."""
    
    def test_get_user_profile_returns_profile(self):
        """Should return profile when exists."""
        service = PersonaService()
        mock_db = MagicMock()
        
        mock_profile = MagicMock(spec=Profile)
        mock_profile.name = "Bob"
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_profile
        
        result = service.get_user_profile(mock_db, "user123")
        
        assert result == mock_profile
        assert result.name == "Bob"
    
    def test_get_user_profile_returns_none(self):
        """Should return None when profile not found."""
        service = PersonaService()
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        result = service.get_user_profile(mock_db, "nonexistent")
        
        assert result is None


class TestGetRecentAssertions:
    """Tests for getting recent semantic assertions."""
    
    def test_get_recent_assertions_returns_list(self):
        """Should return list of assertions."""
        service = PersonaService()
        mock_db = MagicMock()
        
        mock_assertion = MagicMock(spec=SemanticAssertion)
        mock_assertion.text = "Insight 1"
        mock_assertion.category = "pattern"
        
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [mock_assertion]
        
        result = service.get_recent_assertions(mock_db, "user123", limit=5)
        
        assert len(result) == 1
        assert result[0].text == "Insight 1"
    
    def test_get_recent_assertions_respects_limit(self):
        """Should respect limit parameter."""
        service = PersonaService()
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        
        service.get_recent_assertions(mock_db, "user123", limit=10)
        
        # Verify limit was passed
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.assert_called()


class TestGetSessionCount:
    """Tests for getting session count."""
    
    def test_get_session_count_returns_count(self):
        """Should return number of concluded sessions."""
        service = PersonaService()
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.count.return_value = 7
        
        result = service.get_session_count(mock_db, "user123")
        
        assert result == 7
