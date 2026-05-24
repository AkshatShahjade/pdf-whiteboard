
def createQuestionNode(state: AppState):
    return QuestionNode(
        id=create_question_node_id(state),
        node_type="question",
        parent_memory_path=state.latest_memory_path
    )

def create_question_node_id(state: AppState):
    return f"{state.latest_memory_path}question_"
def create_summary_node_id(state: AppState):
    return f"{state.latest_memory_path}summary_"
def create_summary_response_node_id(state: AppState):
    return f"{state.latest_memory_path}sumResp_" 
def create_question_response_node_id(state: AppState, group_name: str):
    return f"{state.latest_memory_path}{group_name}QuesResp_"    
