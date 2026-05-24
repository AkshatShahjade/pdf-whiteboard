from pathlib import Path
from .interface import ContentLoader
from .pdf_loader import PdfLoader
from .text_loader import TextLoader

class ContentLoaderRegistry:
    def __init__(self):
        self._loaders: list[ContentLoader] = []

    def register(self, loader: ContentLoader):
        self._loaders.append(loader)

    def get_loader_for_path(self, path: Path) -> ContentLoader:
        ext = path.suffix.lower()

        for loader in self._loaders:
            if ext in loader.supported_extensions:
                return loader

        raise ValueError(f"No loader registered for extension: {ext}")


content_loader_registry = ContentLoaderRegistry()
content_loader_registry.register(PdfLoader())
content_loader_registry.register(TextLoader())