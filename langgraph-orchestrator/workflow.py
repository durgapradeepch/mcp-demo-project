"""
LangGraph Workflow - Main state machine for orchestrating the MCP chatbot workflow
"""

import logging
from typing import Dict, Any, Literal
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from state import ChatState, create_initial_state
from orchestrator import OrchestratorAgent
from agents.query_analysis_agent import QueryAnalysisAgent
from agents.tool_execution_agent import ToolExecutionAgent
from agents.incident_analysis_agent import IncidentAnalysisAgent
from agents.response_enrichment_agent import ResponseEnrichmentAgent
from utils.llm_client import llm_client

logger = logging.getLogger(__name__)

class LangGraphWorkflow:
    """
    Main LangGraph workflow that orchestrates the entire chat processing pipeline
    """
    
    def __init__(self, mcp_client):
        self.mcp_client = mcp_client
        
        # Initialize agents
        self.orchestrator = OrchestratorAgent()
        self.query_analyzer = QueryAnalysisAgent()
        self.tool_executor = ToolExecutionAgent(mcp_client)
        self.incident_analyzer = IncidentAnalysisAgent()
        self.response_enricher = ResponseEnrichmentAgent()
        
        # Build the workflow graph
        self.workflow = self._build_workflow_graph()
        
        # Compile with memory
        self.app = self.workflow.compile(
            checkpointer=MemorySaver(),
            interrupt_before=[],  # No human-in-the-loop for now
            interrupt_after=[]
        )
    
    def _build_workflow_graph(self) -> StateGraph:
        """Build the LangGraph state machine workflow"""
        
        # Create the workflow graph
        workflow = StateGraph(ChatState)
        
        # Add nodes for each processing stage
        workflow.add_node("orchestrator_start", self._orchestrator_start_node)
        workflow.add_node("query_analysis", self._query_analysis_node)
        workflow.add_node("tool_planning", self._tool_planning_node)
        workflow.add_node("tool_execution", self._tool_execution_node)
        workflow.add_node("incident_analysis", self._incident_analysis_node)
        workflow.add_node("response_enrichment", self._response_enrichment_node)
        workflow.add_node("orchestrator_finish", self._orchestrator_finish_node)
        
        # Set entry point
        workflow.set_entry_point("orchestrator_start")
        
        # Define the main workflow path
        workflow.add_edge("orchestrator_start", "query_analysis")
        workflow.add_edge("query_analysis", "tool_planning")
        workflow.add_edge("tool_planning", "tool_execution")
        
        # Conditional routing after tool execution (using async wrapper)
        workflow.add_conditional_edges(
            "tool_execution",
            self._async_route_wrapper,
            {
                "incident_analysis": "incident_analysis",
                "response_enrichment": "response_enrichment",
                "error_recovery": "orchestrator_finish"
            }
        )
        
        # Routes from incident analysis
        workflow.add_edge("incident_analysis", "response_enrichment")
        
        # Routes to completion
        workflow.add_edge("response_enrichment", "orchestrator_finish")
        workflow.add_edge("orchestrator_finish", END)
        
        return workflow
    
    async def process_query(self, user_query: str, session_id: str = None) -> Dict[str, Any]:
        """
        Main entry point to process a user query through the complete workflow
        """
        try:
            logger.info(f"🚀 Processing query: '{user_query}'")
            
            # Create initial state
            initial_state = create_initial_state(user_query, session_id)
            
            # Execute the workflow
            result = await self.app.ainvoke(
                initial_state,
                config={
                    "configurable": {
                        "thread_id": session_id or initial_state["session_id"]
                    }
                }
            )
            
            # Extract final response
            response = self._format_workflow_response(result)
            
            logger.info(f"✅ Query processing completed successfully")
            return response
            
        except Exception as e:
            logger.error(f"❌ Query processing failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "response": "I encountered an error while processing your request. Please try again.",
                "details": {}
            }
    
    # Node implementations
    
    async def _orchestrator_start_node(self, state: ChatState) -> ChatState:
        """Orchestrator initialization node"""
        logger.info("🎯 Orchestrator: Starting workflow")
        
        # Let orchestrator validate and initialize
        updated_state = await self.orchestrator.orchestrate_workflow(state)
        
        return {
            **updated_state,
            "workflow_status": "running",
            "investigation_depth": 1
        }
    
    async def _query_analysis_node(self, state: ChatState) -> ChatState:
        """Query analysis processing node"""
        logger.info("🔍 Query Analysis: Analyzing user query")
        
        return await self.query_analyzer.analyze_query(state)
    
    async def _tool_planning_node(self, state: ChatState) -> ChatState:
        """Tool planning and sequencing node"""
        logger.info("🛠️ Tool Planning: Creating execution plan using LLM")
        
        # Determine tool sequence based on LLM analysis
        tool_sequence = await self._plan_tool_sequence(state)
        
        return {
            **state,
            "tool_sequence": tool_sequence,
            "current_tool_index": 0
        }
    
    async def _tool_execution_node(self, state: ChatState) -> ChatState:
        """MCP tool execution node"""
        logger.info("⚙️ Tool Execution: Executing MCP tools")
        
        return await self.tool_executor.execute_tools(state)
    
    async def _incident_analysis_node(self, state: ChatState) -> ChatState:
        """Specialized incident analysis node"""
        logger.info("🚨 Incident Analysis: Performing deep incident analysis")
        
        return await self.incident_analyzer.analyze_incident_data(state)
    
    async def _response_enrichment_node(self, state: ChatState) -> ChatState:
        """Response enrichment and finalization node"""
        logger.info("✨ Response Enrichment: Enriching final response")
        
        return await self.response_enricher.enrich_response(state)
    
    async def _orchestrator_finish_node(self, state: ChatState) -> ChatState:
        """Orchestrator finalization node"""
        logger.info("🎯 Orchestrator: Finalizing workflow")
        
        # Final validation and cleanup
        final_state = {
            **state,
            "workflow_status": "completed",
            "completion_timestamp": "2025-10-23T10:00:00Z"  # Would be datetime.now().isoformat()
        }
        
        return final_state
    
    # Routing logic
    
    def _async_route_wrapper(self, state: ChatState) -> Literal["incident_analysis", "response_enrichment", "error_recovery"]:
        """Sync wrapper for async routing function (LangGraph requirement)"""
        import asyncio
        try:
            # Get or create event loop
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            # Run the async routing function
            if loop.is_running():
                # If loop is running, we need to use run_until_complete differently
                task = asyncio.create_task(self._route_after_tool_execution(state))
                return loop.run_until_complete(task)
            else:
                return loop.run_until_complete(self._route_after_tool_execution(state))
        except Exception as e:
            logger.error(f"Error in async routing wrapper: {e}")
            # Fallback if async fails
            return "response_enrichment"
    
    async def _route_after_tool_execution(self, state: ChatState) -> Literal["incident_analysis", "response_enrichment", "error_recovery"]:
        """Route after tool execution using LLM-based routing decisions"""
        
        # Check for critical errors first
        error_count = state.get("error_count", 0)
        if error_count >= 3:
            logger.warning("⚠️ Routing to error recovery due to high error count")
            return "error_recovery"
        
        try:
            # Use LLM to make intelligent routing decisions
            routing_decision = await llm_client.make_routing_decision(
                user_query=state.get("user_query", ""),
                query_analysis=state.get("query_analysis", {}),
                mcp_results=state.get("mcp_results", []),
                execution_context=state.get("context_data", {})
            )
            
            # Validate routing decision
            valid_routes = ["incident_analysis", "response_enrichment", "error_recovery"]
            if routing_decision in valid_routes:
                logger.info(f"🤖 LLM routing decision: {routing_decision}")
                return routing_decision
            
            logger.warning(f"Invalid LLM routing decision: {routing_decision}, using fallback")
            
        except Exception as e:
            logger.error(f"Error in LLM routing decision, using fallback: {e}")
        
        # Fallback routing logic
        query_type = state.get("query_type", "")
        has_incidents = self._check_for_incident_data(state)
        
        if query_type in ["incident_analysis", "root_cause"] or has_incidents:
            logger.info("🚨 Fallback routing to incident analysis")
            return "incident_analysis"
        
        logger.info("✨ Fallback routing to response enrichment")
        return "response_enrichment"
    
    def _check_for_incident_data(self, state: ChatState) -> bool:
        """Check if MCP results contain incident-related data"""
        
        for result in state.get("mcp_results", []):
            if not result.get("success"):
                continue
            
            tool_name = result["tool_name"]
            
            # Check for incident-related tools
            if tool_name in ["get_incidents", "search_incidents", "get_incident_by_id"]:
                data = result.get("result", {}).get("data", {})
                if isinstance(data, dict) and (data.get("incidents") or data.get("incident")):
                    return True
        
        return False
    
    async def _plan_tool_sequence(self, state: ChatState) -> list[str]:
        """Plan the sequence of MCP tools to execute using LLM analysis"""
        
        try:
            # Use LLM to dynamically plan tool sequence
            tool_plan = await llm_client.plan_tool_sequence(
                user_query=state.get("user_query", ""),
                query_analysis=state.get("query_analysis", {}),
                available_tools=state.get("available_tools", [])
            )
            
            # Extract tool names from the plan
            if isinstance(tool_plan, dict) and "tools" in tool_plan:
                return tool_plan["tools"]
            elif isinstance(tool_plan, list):
                return tool_plan
            
            # If LLM returns unexpected format, fall back to basic tools
            logger.warning(f"Unexpected tool plan format from LLM: {tool_plan}")
            return ["get_database_stats", "get_schema"]
            
        except Exception as e:
            logger.error(f"Error in LLM tool planning, using fallback: {e}")
            
            # Fallback to basic tool planning
            query_type = state.get("query_type", "general")
            
            if query_type == "incident_analysis":
                return ["get_incidents", "search_logs"]
            elif query_type == "exploration":
                return ["get_schema", "get_node_labels", "get_database_stats"]
            elif query_type == "root_cause":
                return ["search_logs", "get_incidents"]
            else:
                return ["get_database_stats", "get_schema"]
    
    def _format_workflow_response(self, final_state: ChatState) -> Dict[str, Any]:
        """Format the final workflow response for external consumption"""
        
        success = final_state.get("workflow_status") == "completed"
        
        response = {
            "success": success,
            "response": final_state.get("final_response", "Analysis completed"),
            "query_analysis": {
                "query_type": final_state.get("query_type"),
                "intent": final_state.get("intent"),
                "confidence_score": final_state.get("confidence_score", 0)
            },
            "execution_summary": {
                "tools_executed": len(final_state.get("executed_tools", [])),
                "tools_planned": len(final_state.get("tool_sequence", [])),
                "success_rate": self._calculate_execution_success_rate(final_state),
                "investigation_depth": final_state.get("investigation_depth", 1)
            },
            "enrichment": final_state.get("enrichment_data", {}),
            "session_info": {
                "session_id": final_state.get("session_id"),
                "request_id": final_state.get("request_id"),
                "timestamp": final_state.get("completion_timestamp")
            }
        }
        
        # Add incident analysis if available
        if final_state.get("incident_analysis"):
            response["incident_analysis"] = {
                "root_causes_found": len(final_state["incident_analysis"].get("root_causes", [])),
                "correlations_found": len(final_state["incident_analysis"].get("correlations", [])),
                "confidence": final_state["incident_analysis"].get("confidence_score", 0)
            }
        
        return response
    
    def _calculate_execution_success_rate(self, state: ChatState) -> float:
        """Calculate the success rate of tool executions"""
        
        mcp_results = state.get("mcp_results", [])
        if not mcp_results:
            return 0.0
        
        successful = sum(1 for result in mcp_results if result.get("success"))
        return successful / len(mcp_results)
    
    def get_workflow_status(self) -> Dict[str, Any]:
        """Get current workflow status and metrics"""
        
        return {
            "workflow_name": "LangGraph MCP Orchestrator",
            "version": "1.0.0",
            "nodes": [
                "orchestrator_start",
                "query_analysis", 
                "tool_planning",
                "tool_execution",
                "incident_analysis",
                "response_enrichment",
                "orchestrator_finish"
            ],
            "agents": {
                "orchestrator": self.orchestrator.get_orchestrator_status(),
                "query_analyzer": {"name": self.query_analyzer.name},
                "tool_executor": {"name": self.tool_executor.name},
                "incident_analyzer": {"name": self.incident_analyzer.name},
                "response_enricher": {"name": self.response_enricher.name}
            }
        }