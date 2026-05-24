# chunking/factory.py

from langchain_text_splitters import RecursiveCharacterTextSplitter, Language

EXTENSION_TO_LANGUAGE = {
    ".py": Language.PYTHON,
    ".js": Language.JS,
    ".ts": Language.JS,       # close enough initially
    ".java": Language.JAVA,
    ".cpp": Language.CPP,
    ".go": Language.GO,
    ".md": Language.MARKDOWN,
    ".html": Language.HTML,
    ".tex": Language.LATEX,
}

def get_splitter_for_extension(ext: str):
    language = EXTENSION_TO_LANGUAGE.get(ext.lower())

    if language is not None:
        return RecursiveCharacterTextSplitter.from_language(
            language=language,
            chunk_size=800,
            chunk_overlap=120,
        )

    return RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=120,
    )