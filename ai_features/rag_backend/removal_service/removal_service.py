from pathlib import Path

from factories.vector_store_factory import get_vector_store


def _normalize_path(path_str: str) -> str:
    return str(Path(path_str).expanduser().resolve(strict=False))


def _is_within_target(source_path: str, target_path: Path) -> bool:
    source = Path(_normalize_path(source_path))

    if source == target_path:
        return True

    try:
        source.relative_to(target_path)
        return True
    except ValueError:
        return False


def delete_folder(folder_path: str, provider: str = "ollama") -> dict[str, int | str]:
    target_path = Path(folder_path).expanduser().resolve(strict=False)
    vector_store = get_vector_store(provider)
    stored_chunks = vector_store.get(include=["metadatas"])

    ids_to_delete: list[str] = []
    source_paths: set[str] = set()

    for chunk_id, metadata in zip(
        stored_chunks["ids"],
        stored_chunks["metadatas"],
        strict=False,
    ):
        if metadata is None:
            continue

        source_path = metadata.get("source_path")
        if not source_path:
            continue

        if _is_within_target(source_path, target_path):
            ids_to_delete.append(chunk_id)
            source_paths.add(_normalize_path(source_path))

    if not ids_to_delete:
        return {
            "deleted_chunks": 0,
            "deleted_files": 0,
            "folder_path": str(target_path),
            "provider": provider,
        }

    batch_size = 100
    for start in range(0, len(ids_to_delete), batch_size):
        vector_store.delete(ids=ids_to_delete[start:start + batch_size])

    return {
        "deleted_chunks": len(ids_to_delete),
        "deleted_files": len(source_paths),
        "folder_path": str(target_path),
        "provider": provider,
    }
