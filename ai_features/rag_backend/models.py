from dataclasses import dataclass
from typing import Any

@dataclass
class ContentDocument:
    source_path: str
    file_extension: str
    content_type: str
    text: str
    metadata: dict[str, Any]
