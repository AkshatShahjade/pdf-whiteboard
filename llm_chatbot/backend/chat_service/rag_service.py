from ai_provider_adapter.switch import get_llm_adapter
from factories.vector_store_factory import get_vector_store

def answer_question(question: str, provider: str = "ollama"):
    adapter = get_llm_adapter(provider)

    vector_store = get_vector_store(provider)
    retriever = vector_store.as_retriever(search_kwargs={"k": 5}) # DOUBT what is retriever and I didnt' define as_retriever anywhere...

    docs = retriever.invoke(question)

    context = "\n\n".join(
        f"Source: {doc.metadata.get('filename')}, "
        f"Page: {doc.metadata.get('page', 'N/A')}\n"
        f"{doc.page_content}"
        for doc in docs
    )

    messages = [
        {
            "role": "system",
            "content": (
                "You are a document-grounded assistant. "
                "Answer only using the provided context. "
                "If the answer is not in the context, say you don't know."
            ),
        },
        {
            "role": "user",
            "content": f"""
Question:
{question}

Context:
{context}

Answer with useful detail and cite filename/page where possible.
""",
        },
    ]

    answer = adapter.generate(messages)

    return {
        "answer": answer,
        "sources": [doc.metadata for doc in docs],
        "provider": provider,
    }
