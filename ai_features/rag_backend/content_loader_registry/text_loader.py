from pathlib import Path
from models import ContentDocument
from .interface import ContentLoader

class TextLoader(ContentLoader):
    content_type = "text"
    supported_extensions = {".txt", ".md"}

    def load(self, path: Path) -> list[ContentDocument]:
        text = path.read_text(encoding="utf-8")

        return [
            ContentDocument(
                source_path=str(path),
                file_extension=path.suffix.lower(),
                content_type=self.content_type,
                text=text,
                metadata={
                    "filename": path.name,
                },
            )
        ]
