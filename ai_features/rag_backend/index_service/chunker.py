from factories.chunker_factory import get_splitter_for_extension
from models import ContentDocument

def chunk_documents(docs: list[ContentDocument]):

    chunks = []

    for doc in docs:
        splitter = get_splitter_for_extension(doc.file_extension)
        split_texts = splitter.split_text(doc.text)

        for i, chunk_text in enumerate(split_texts):
            chunks.append({
                "text": chunk_text,
                "metadata": {
                    **doc.metadata,
                    "source_path": doc.source_path,
                    "content_type": doc.content_type,
                    "chunk_index": i,
                }
            })

    return chunks
