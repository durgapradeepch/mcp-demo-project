"""
LangGraph State Management for MCP Chatbot Orchestrator
Defines the state structure that flows through the entire workflow
"""

from typing import TypedDict, List, Dict, Any, Optional, Annotated
from datetime import datetime
import uuid
from operator import add

class ChatState(TypedDict):
    """Complete state structure for the chat orchestration workflow"""
    
    # Core request data
    session_id: str
    request_id: str
    user_query: str
    timestamp: str
    
    # Conversation history for memory - uses reducer to append messages
    messages: Annotated[List[Dict[str, str]], add]  # List of {"role": "user"|"assistant", "content": str}
    
    # Query analysis results
    query_type: str  # "incident_analysis", "exploration", "general", "root_cause"
    intent: str
    entities: List[str]
    confidence_score: float
    specificity_level: str  # "high", "medium", "low"
    
    # Tool execution planning
    tool_plan: List[Dict[str, Any]]  # List of {"name": str, "parameters": Dict[str, Any]}
    executed_tools: List[str]
    current_tool_index: int
    available_tools: List[str]  # List of available MCP tool names
    
    # Data accumulation
    mcp_results: List[Dict[str, Any]]
    context_data: Dict[str, Any]
    correlations: List[Dict[str, Any]]
    
    # Specialized analysis results
    incident_analysis: Optional[Dict[str, Any]]
    root_cause_analysis: Optional[Dict[str, Any]]
    timeline_data: Optional[List[Dict[str, Any]]]
    
    # Response construction
    enrichment_data: Dict[str, Any]
    forward_links: List[str]
    annotations: List[str]
    final_response: str
    
    # Orchestration metadata
    workflow_status: str  # "running", "completed", "failed", "paused", "awaiting_clarification"
    current_agent: str
    error_count: int
    retry_attempts: int
    
    # Ambiguity & Clarification Loop
    is_ambiguous: bool
    clarification_question: str
    clarification_count: int  # Track attempts (max 1 or 2)
    original_intent: str      # Store the initial intent before clarification
    
    # Quality and confidence tracking
    data_quality_score: float
    response_completeness: float
    investigation_depth: int


def create_initial_state(user_query: str, session_id: str = None) -> ChatState:
    """Create initial state for a new chat request"""
    
    if not session_id:
        session_id = str(uuid.uuid4())
    
    return ChatState(
        # Core request data
        session_id=session_id,
        request_id=str(uuid.uuid4()),
        user_query=user_query,
        timestamp=datetime.now().isoformat(),
        
        # Conversation history (empty for new conversations, will be populated from checkpointer)
        messages=[],
        
        # Query analysis results
        query_type="",
        intent="",
        entities=[],
        confidence_score=0.0,
        specificity_level="unknown",
        
        # Tool execution planning
        tool_plan=[],
        executed_tools=[],
        current_tool_index=0,
        available_tools=[],
        
        # Data accumulation
        mcp_results=[],
        context_data={},
        correlations=[],
        
        # Specialized analysis results
        incident_analysis=None,
        root_cause_analysis=None,
        timeline_data=None,
        
        # Response construction
        enrichment_data={},
        forward_links=[],
        annotations=[],
        final_response="",
        
        # Orchestration metadata
        workflow_status="initialized",
        current_agent="orchestrator",
        error_count=0,
        retry_attempts=0,
        
        # Ambiguity & Clarification Loop
        is_ambiguous=False,
        clarification_question="",
        clarification_count=0,
        original_intent="",
        
        # Quality and confidence tracking
        data_quality_score=0.0,
        response_completeness=0.0,
        investigation_depth=0
    )


def update_state_context(state: ChatState, key: str, value: Any) -> ChatState:
    """Helper to safely update context data"""
    new_context = state["context_data"].copy()
    new_context[key] = value
    
    return {**state, "context_data": new_context}


def add_mcp_result(state: ChatState, tool_name: str, result: Dict[str, Any], 
                   agent: str = "unknown") -> ChatState:
    """Add a new MCP tool execution result to the state"""
    
    new_result = {
        "tool_name": tool_name,
        "result": result,
        "agent": agent,
        "timestamp": datetime.now().isoformat(),
        "success": "error" not in result
    }
    
    new_results = state["mcp_results"].copy()
    new_results.append(new_result)
    
    executed_tools = state["executed_tools"].copy()
    if tool_name not in executed_tools:
        executed_tools.append(tool_name)
    
    return {
        **state, 
        "mcp_results": new_results,
        "executed_tools": executed_tools
    }


def calculate_state_health(state: ChatState) -> Dict[str, Any]:
    """Calculate overall health and progress metrics for the state"""
    
    total_tools_planned = len(state["tool_plan"])
    tools_executed = len(state["executed_tools"])
    successful_executions = sum(1 for result in state["mcp_results"] if result["success"])
    
    progress_percentage = (tools_executed / total_tools_planned * 100) if total_tools_planned > 0 else 0
    success_rate = (successful_executions / tools_executed * 100) if tools_executed > 0 else 0
    
    return {
        "progress_percentage": progress_percentage,
        "success_rate": success_rate,
        "tools_remaining": total_tools_planned - tools_executed,
        "error_rate": state["error_count"] / tools_executed if tools_executed > 0 else 0,
        "overall_health": "healthy" if success_rate > 80 and state["error_count"] < 3 else "degraded"
    }