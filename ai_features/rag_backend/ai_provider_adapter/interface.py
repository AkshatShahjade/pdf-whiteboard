from abc import ABC, abstractmethod
from typing import Any, TypeVar, Type
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel) # bound means??? TODO


class LLMAdapter(ABC):
    @abstractmethod
    def generate(self, messages: list[Any]) -> str:
        pass

    @abstractmethod
    def generate_structured(self, messages: list[Any], schema: Type[T]) -> T:
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