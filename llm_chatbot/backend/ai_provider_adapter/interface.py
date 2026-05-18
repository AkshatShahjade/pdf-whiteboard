from abc import ABC, abstractmethod
from typing import Any

class LLMAdapter(ABC):
    @abstractmethod
    def generate(self, messages: list[dict]) -> str:
        pass

    @abstractmethod
    def get_embeddings(self) -> Any:
        """
        Return a LangChain-compatible embeddings object.
        Example:
        - OllamaEmbeddings(...)
        - OpenAIEmbeddings(...)
        """
        pass