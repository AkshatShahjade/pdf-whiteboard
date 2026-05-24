from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from .interface import LLMAdapter

class OpenAIAdapter(LLMAdapter):
    def __init__(
        self,
        api_key: str,
        chat_model: str = "gpt-4o-mini",
        embedding_model: str = "text-embedding-3-small",
    ):
        self.api_key = api_key
        self.chat_model_name = chat_model
        self.embedding_model_name = embedding_model

        self.chat_model = ChatOpenAI(
            model=self.chat_model_name,
            api_key=self.api_key,
        )
        self.embedding_model = OpenAIEmbeddings(
            model=self.embedding_model_name,
            api_key=self.api_key,
        )

    def generate(self, messages: list[dict]) -> str:
        result = self.chat_model.invoke(messages)
        return result.content

    def generate_structured(self, messages: list[Any], schema: Type[T]) -> T:
        structured_model = self.chat_model.with_structured_output(schema)
        return structured_model.invoke(messages)

    def get_embeddings(self):
        return self.embedding_model
