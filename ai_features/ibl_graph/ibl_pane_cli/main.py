from platform import node
from dataclasses import dataclass
from typing import Any, Literal
from ai_features.rag_backend.ibl_pane_cli.local_json_io_helpers import existsFileOrDir, retrieveNode
from payload_registry import node_setup
from pydantic import BaseModel
from domain_models import BaseNode, AppState

def main():
    project_folder_path = cli_home_screen()
    originInquiryHubNode = retrieveNode(f"origin", project_folder_path)
    state = AppState(
        app_running=True,
        latest_memory_path = project_folder_path,
        current_node = originInquiryHubNode,
        # latest_input=None
    )
        
    cli_app(state)

def setUpConfig():
    
    config_json = {
            root_folder_path: "",
            "project_names": [],
        }

    config_json[root_folder_path] = input("Enter the root folder path: ")
    
    write_json_file(f"{root_folder}/config.json", config_json)

def cli_home_screen():
    if(not existsFileOrDir(f"{root_folder}/config.json")):  
        setUpConfig()

    config_json = read_json_file(f"{root_folder}/config.json")
    
    print(f"Current Root Folder: {config_json[root_folder_path]}")
    # if(input("want to change root folder? (y/n)")) == "y":
    #     config_json[root_folder_path] = input("Enter the root folder path: ")
    #   Shift config file  
    #   write_json_file(f"{root_folder}/config.json", config_json)
    if(input("list project names? (y/n)")) == "y":
        print("Project Names:")
        for project_name in config_json["project_names"]:
            print(project_name)
        
    project_name = input("Enter project name: ")
    project_folder_path = f"{config_json[root_folder_path]}{project_name}/"
    if(not existsFileOrDir(project_folder_path)):
        setUpProjectFolder(project_folder_path, project_name)

    return project_folder_path

def setUpProjectFolder(project_folder_path: str, project_name: str):
    os.makedirs(project_folder_path)
    config_json["project_names"].append(project_name)
    write_json_file(f"{root_folder}/config.json", config_json)

    originInquiryHubNode = InquiryHubNode(
        id=f"{project_folder_path}origin/",
        title="origin",
        parent_response_id=None,
        at_forefront=True,
    )

    persistNode(originInquiryHubNode, project_folder_path)

def cli_app(initial_state: AppState):
    
    state = initial_state
    activate_node = node_setup()

    # ibl_graph = StateGraph(AppState)

    while(state.app_running):
        state = activate_node[state.current_node.node_type](state)
        # printPayload(state, payload_registry)
        # state = input_and_routing(state)


def printPayload(state: AppState, payload_registry: dict[str, PayloadFunction]):
    pass



def input_and_routing(state: AppState):
    pass


