from fastapi import FastAPI
from pydantic import BaseModel
from index_service.index_service import index_folder
from chat_service.rag_service import answer_question
from removal_service.removal_service import delete_folder

app = FastAPI()

class DeleteRequest(BaseModel):
    folder_path: str
    provider: str = "ollama" # which vector_store to delete from?

class IndexRequest(BaseModel):
    folder_path: str
    provider: str = "ollama"

class ChatRequest(BaseModel):
    question: str
    provider: str = "ollama"

@app.post("/index-folder")
def index_folder_endpoint(req: IndexRequest):
    return index_folder(
        folder_path=req.folder_path,
        provider=req.provider,
    )

@app.post("/chat")
def chat_endpoint(req: ChatRequest):
    return answer_question(
        question=req.question,
        provider=req.provider,
    )

@app.delete("/delete")
def delete_folder_endpoint(req: DeleteRequest):
    return delete_folder(
        folder_path=req.folder_path,
        provider=req.provider,
    )
