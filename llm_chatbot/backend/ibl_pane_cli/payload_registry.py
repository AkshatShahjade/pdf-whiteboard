from tkinter import N
from llm_chatbot.backend.ibl_pane_cli.domain_models import BaseNode, NodeType
from typing import Callable

from llm_chatbot.backend.ibl_pane_cli.local_json_io_helpers import remove_from_forefront
from llm_chatbot.backend.ibl_pane_cli.main import AppState

PayloadFunction = Callable[[AppState], AppState]

def inquiry_hub_fn(state: AppState) -> AppState:
    new_state: AppState = None
    message = '''Go To:
    \t1. Question Node
    \t2. Summary Node
    (Select 1 or 2)
    '''
    user_response = input(message)

    if(user_response == '1'):
        # question_node(node)
        remove_from_forefront(state.current_node)
        new_node = QuestionNode(
            id=f"{state.current_node.id}question/",
            node_type="question",
            parent_memory_path=state.latest_memory_path,
            at_forefront=True   
        )
        
    elif(user_response == '2'):
        # Navigation go to summary node
        pass
    else:
        print("Invalid Input")

def response_hub_fn(state: AppState) -> AppState:       
    return f"response_hub_{node.id}"

def question_node_fn(state: AppState) -> AppState:
    return f"question_node_{node.id}"

def summary_node_fn(state: AppState) -> AppState:
    return f"summary_node_{node.id}"

def response_node_fn(state: AppState) -> AppState:
    return f"response_node_{node.id}"

def node_setup():
    payLoadRegistry: dict[NodeType, PayloadFunction] = {}

    payLoadRegistry["inquiry_hub"] = inquiry_hub_fn
    payLoadRegistry["response_hub"] = response_hub_fn

    payLoadRegistry["question_node"] = question_node_fn
    payLoadRegistry["summary_node"] = summary_node_fn
    payLoadRegistry["response_node"] = response_node_fn

    return payLoadRegistry
