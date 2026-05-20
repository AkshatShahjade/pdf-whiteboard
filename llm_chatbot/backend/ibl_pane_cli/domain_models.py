from typing import Literal, Optional
from pydantic import BaseModel, Field
from uuid import uuid4
from dataclasses import dataclass, field

NodeType = Literal[
    "inquiry_hub",
    "question_node",
    "summary_node",
    "response_hub",
    "response_node",
]

NODE_MODEL_REGISTRY = {
    "inquiry_hub": InquiryHubNode,
    "question": QuestionNode,
    "summary": SummaryNode,
    "response_hub": ResponseHubNode,
    "response": ResponseNode,
}

class AppState(BaseModel):
    app_running: bool
    current_node: BaseNode | None = None
    # latest_input: str | None = None
    latest_memory_path: str

class BaseNode(BaseModel):
    id: str
    node_type: NodeType
    title: str = ""
class SummaryNode(BaseNode):
    node_type: Literal["summary"] = "summary"
    parent_memory_path: str | None = None
    summary_text: str = ""
    response_id: str | None = None

class InquiryHubNode(BaseNode):
    node_type: Literal["inquiry_hub"] = "inquiry_hub"
    parent_response_id: str | None = None

class ResponseHubNode(BaseNode):
    node_type: Literal["response_hub"] = "response_hub"
    response_ids: list[str] = Field(default_factory=list)



class QuestionNode(BaseNode):
    node_type: Literal["question"] = "question"
    parent_memory_path: str | None = None
    raw_text: str = ""
    groups: list[list[str]] = Field(default_factory=list)
    response_ids: list[str] = Field(default_factory=list)


class ResponseNode(BaseNode):
    node_type: Literal["response"] = "response"
    parent_memory_path: str | None = None
    content: str = ""
    suggested_questions: list[str] = Field(default_factory=list)

