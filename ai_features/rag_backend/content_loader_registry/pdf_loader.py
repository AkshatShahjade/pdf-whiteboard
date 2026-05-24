# content/pdf_loader.py

from pathlib import Path
from models import ContentDocument
from pypdf import PdfReader
from .interface import ContentLoader

class PdfLoader(ContentLoader):
    content_type = "pdf"
    supported_extensions = {".pdf"}

    def load(self, path: Path) -> list[ContentDocument]:
        reader = PdfReader(str(path))
        docs = []

        for page_index, page in enumerate(reader.pages):
            text = page.extract_text() or ""

            if text.strip():
                docs.append(ContentDocument(
                    source_path=str(path),
                    file_extension=path.suffix.lower(),
                    content_type=self.content_type,
                    text=text,
                    metadata={
                        "page": page_index + 1,
                        "filename": path.name,
                    },
                ))

        return docs
