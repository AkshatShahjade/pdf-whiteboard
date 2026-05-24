from abc import ABC, abstractmethod
from pathlib import Path
from models import ContentDocument


class ContentLoader(ABC):
    content_type: str
    supported_extensions: set[str]

    @abstractmethod # DOUBT
    def load(self, path: Path) -> list[ContentDocument]:
        pass
