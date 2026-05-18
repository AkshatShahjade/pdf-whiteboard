from factories.config_factory import get_settings
from .interface import LLMAdapter
from .ollama_adapter import OllamaAdapter
from .openai_adapter import OpenAIAdapter

def get_llm_adapter(provider: str) -> LLMAdapter:
    settings = get_settings()

    if provider == "ollama":
        return OllamaAdapter()

    if provider == "openai":
        if not settings.openai_api_key:
            raise ValueError(
                "OpenAI provider selected but OPENAI_API_KEY is not configured. "
                "Set it in backend/.env or the process environment."
            )

        return OpenAIAdapter(
            api_key=settings.openai_api_key,
            chat_model=settings.openai_chat_model,
            embedding_model=settings.openai_embedding_model,
        )

    raise ValueError(f"Unknown LLM provider: {provider}")
