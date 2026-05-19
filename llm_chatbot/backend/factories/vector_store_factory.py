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

def get_vector_store_retriever(provider: str = 'ollama', presets: str = "", search_type: str = 'similarity', search_kwargs: dict = {"k": 5}):
    vector_store = get_vector_store(provider)
    # If preset, then use that, if preset is null, then go for the advanced settings...
    # Later add options for mmr, etc... using type and settigns (same as the as_retriver k, fetch_k, etc...)
    return vector_store.as_retriever(search_type = search_type, search_kwargs=search_kwargs)