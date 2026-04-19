"""Services package for OpenMarcus."""

from .llm import (
    LLMService,
    MockLLMService,
    ChatMessage,
    StreamChunk,
    get_llm_service,
    set_llm_service,
)
from .ram_detection import (
    RAMDetectionService,
    ModelRecommendation,
    get_ram_detection_service,
    get_total_ram_gb,
    get_available_ram_gb,
    get_recommended_models,
    get_best_model_name,
)
from .persona import (
    PersonaService,
    get_persona_service,
    MARCUS_BASE_PROMPT,
)
from .psych_update import (
    PsychUpdateService,
    get_psych_update_service,
)

__all__ = [
    "LLMService",
    "MockLLMService", 
    "ChatMessage",
    "StreamChunk",
    "get_llm_service",
    "set_llm_service",
    "RAMDetectionService",
    "ModelRecommendation",
    "get_ram_detection_service",
    "get_total_ram_gb",
    "get_available_ram_gb",
    "get_recommended_models",
    "get_best_model_name",
    "PersonaService",
    "get_persona_service",
    "MARCUS_BASE_PROMPT",
    "PsychUpdateService",
    "get_psych_update_service",
]
