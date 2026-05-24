from pathlib import Path
from content_loader_registry.registry import content_loader_registry
from .chunker import chunk_documents
from factories.vector_store_factory import get_vector_store

def index_folder(folder_path: str, provider: str = "ollama"):
    folder = Path(folder_path)
    vector_store = get_vector_store(provider)
    all_chunks = []

    for path in folder.rglob("*"):
        print("file:", path)
        if not path.is_file():
            continue

        try:
            loader = content_loader_registry.get_loader_for_path(path)
            docs = loader.load(path)
            print("docs:", len(docs), "from", path.name)

            chunks = chunk_documents(docs)
            print("chunks:", len(chunks), "from", path.name)

            all_chunks.extend(chunks)
        except ValueError:
            print("unsupported:", path)
            continue

    print("total chunks:", len(all_chunks))

    if not all_chunks:
        return {"indexed_chunks": 0}

    print("before add_texts")
    vector_store.add_texts(
        texts=[chunk["text"] for chunk in all_chunks],
        metadatas=[chunk["metadata"] for chunk in all_chunks],
    )
    print("after add_texts")

    return {
        "indexed_chunks": len(all_chunks),
        "provider": provider,
    }
