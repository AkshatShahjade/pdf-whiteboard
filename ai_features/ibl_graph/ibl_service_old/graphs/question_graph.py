from typing import Optional, Literal
from typing_extensions import TypedDict
from uuid import uuid4

from langgraph.graph import StateGraph, START, END

from ai_provider_adapter.switch import get_llm_adapter
from factories.vector_store_factory import get_vector_store_retriever
from ..ibl_models import (
    QuestionItem,
    InquiryResponseNode,
    QuestionGroupResponse,
    SourceRef,
)
from ..ibl_prompts import QUESTION_GROUP_PROMPT

class SummaryRunState(TypedDict):
    pass

class QuestionRunState(TypedDict):
    graph_id: str
    parent_node_id: Optional[str]
    provider: str

    questions: list[QuestionItem]
    context_refs: list[str]

    grouped_questions: dict[str, list[QuestionItem]]
    output_nodes: list[dict]


def group_questions_node(state: QuestionRunState):
    grouped: dict[str, list[QuestionItem]] = {}

    for q in state["questions"]:
        group = q["group"]

        # ignore ungrouped suggested questions
        if not group:
            continue

        grouped.setdefault(group, []).append(q)

    return {"grouped_questions": grouped}


def generate_responses_node(state: QuestionRunState):
    adapter = get_llm_adapter(state["provider"])

    retriever = get_vector_store_retriever(state["provider"])

    output_nodes = []

    for group_label, questions in state["grouped_questions"].items():
        question_text = "\n".join(
            f"{i+1}. {q['text']}"
            for i, q in enumerate(questions)
        )

        # MVP: RAG retrieve using the grouped questions as query
        retrieved_docs = retriever.invoke(question_text)

        retrieved_context = "\n\n".join(
            f"Source: {doc.metadata.get('filename')}, "
            f"Page: {doc.metadata.get('page', 'N/A')}\n"
            f"{doc.page_content}"
            for doc in retrieved_docs
        )

        messages = QUESTION_GROUP_PROMPT.format_messages(
            parent_context="MVP: no parent context loaded yet.",
            retrieved_context=retrieved_context,
            group_label=group_label,
            questions=question_text,
        )

        result: QuestionGroupResponse = adapter.generate_structured(messages, QuestionGroupResponse)

        response_node = InquiryResponseNode(
            id=str(uuid4()),
            graph_id=state["graph_id"],
            parent_node_id=state["parent_node_id"],
            node_type="response",
            title=result.title,
            content=result.answer,
            group_label=group_label,
            addressed_questions=result.addressed_questions,
            key_concepts=result.key_concepts,
            suggested_questions=result.suggested_questions,
            source_refs=[
                SourceRef(
                    filename=doc.metadata.get("filename"),
                    page=doc.metadata.get("page"),
                    snippet=doc.page_content[:250],
                )
                for doc in retrieved_docs
            ],
        )

        output_nodes.append(response_node.model_dump())

    return {"output_nodes": output_nodes}


def build_question_pane_graph():
    builder = StateGraph(QuestionRunState)

    builder.add_node("group_questions", group_questions_node)
    builder.add_node("generate_responses", generate_responses_node)

    builder.add_edge(START, "group_questions")
    builder.add_edge("group_questions", "generate_responses")
    builder.add_edge("generate_responses", END)

    return builder.compile()