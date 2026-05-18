from langchain_ollama import ChatOllama, OllamaEmbeddings
from .interface import LLMAdapter

class OllamaAdapter(LLMAdapter):
    def __init__(
        self,
        chat_model_name: str = "qwen2.5:1.5b",
        embedding_model_name: str = "nomic-embed-text",
    ):
        self.chat_model_name = chat_model_name
        self.embedding_model_name = embedding_model_name

        self.chat_model = ChatOllama(model=self.chat_model_name)
        self.embedding_model = OllamaEmbeddings(model=self.embedding_model_name)

    def generate(self, messages: list[dict]) -> str:
        result = self.chat_model.invoke(messages)
        return result.content

    def get_embeddings(self):
        return self.embedding_model