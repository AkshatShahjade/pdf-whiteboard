import os
import pathlib

from llm_chatbot.backend.ibl_pane_cli.domain_models import ResponseHubNode

def read_json_file(file_path: str) -> dict[str, str]:
    with open(file_path, 'r') as file:
        data = json.load(file)
    return data

def write_json_file(file_path: str, data: dict[str, str]):
    with open(file_path, 'w') as file:
        json.dump(data, file, indent=4)

def existsFileOrDir(file_path: str) -> bool:
    return os.path.exists(file_path)

def persistNode():
    pass

def retrieveNode(node_id: str, project_folder_path: str) -> BaseNode | None:
    if not existsFileOrDir():
        return None
    with open("", 'r') as file:
        data = json.load(file)
        return NODE_MODEL_REGISTRY[data["node_type"]](**data)

def remove_from_forefront(node: BaseNode):
    node.at_forefront = False
    persistNode(node, project_folder_path)

# def create_node_id(node_name: str, root_folder: str):
#     if (node.parent_id is None):
#         return f"{root_folder}/{node_name}"
#     else:
#         return f"{node.parent_id}/{node_name}"