from typing import Literal, Optional
from pydantic import BaseModel, Field


class QuestionItem(BaseModel):
    id: str
    text: str
    group: Optional[str] = None  # "A", "B", "C", etc.
    origin: Literal["user", "suggested"] = "user"


class QuestionPaneInput(BaseModel):
    graph_id: str
    parent_node_id: Optional[str] = None
    node_type: Literal["target"]
    title: Optional[str] = None
    questions: list[QuestionItem]
    provider: str = "ollama"


class SummaryPaneInput(BaseModel):
    graph_id: str
    parent_node_id: Optional[str] = None
    node_type: Literal["target"]
    title: Optional[str] = None
    summary_text: str
    context_refs: list[str] = Field(default_factory=list)
    provider: str = "ollama"


class SourceRef(BaseModel):
    source_id: Optional[str] = None
    filename: Optional[str] = None
    page: Optional[int] = None
    snippet: Optional[str] = None


class InquiryResponseNode(BaseModel):
    id: str
    graph_id: str
    parent_node_id: Optional[str]
    node_type: Literal["response"]
    title: str
    content: str
    group_label: Optional[str] = None # A, B, etc...
    addressed_questions: list[str] = Field(default_factory=list)
    key_concepts: list[str] = Field(default_factory=list)
    suggested_questions: list[str] = Field(default_factory=list)
    source_refs: list[SourceRef] = Field(default_factory=list)


class QuestionGroupResponse(BaseModel):
    title: str
    answer: str
    addressed_questions: list[str]
    key_concepts: list[str]
    suggested_questions: list[str]


class SummaryCritiqueResponse(BaseModel):
    title: str
    corrections: list[str]
    missing_points: list[str]
    refined_model: str
    suggested_questions: list[str] # in this context will be more like - suggested further things to explore....