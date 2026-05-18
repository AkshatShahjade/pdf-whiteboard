from langchain_chroma import Chroma
from ai_provider_adapter.switch import get_llm_adapter


# later can add options for different vector stores...
def get_vector_store(provider: str = "ollama"):
    adapter = get_llm_adapter(provider)
    embeddings = adapter.get_embeddings()

    return Chroma(
        collection_name=f"lemmamap_knowledge_{provider}",
        persist_directory=f"./storage/chroma_db/{provider}",
        embedding_function=embeddings,
    )
