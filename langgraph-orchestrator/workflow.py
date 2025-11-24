"""
Enhanced LangGraph Workflow - Handles multi-part queries intelligently
"""

import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, Literal, List
from langgraph.graph import StateGraph, END
# from langgraph.checkpoint.memory import MemorySaver  # <-- Removed for persistent memory
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver  # <-- Async version for persistent SQLite memory

from state import ChatState, create_initial_state
from orchestrator import OrchestratorAgent
from agents.query_analysis_agent import QueryAnalysisAgent
from agents.tool_execution_agent import ToolExecutionAgent
from agents.incident_analysis_agent import IncidentAnalysisAgent
from agents.response_enrichment_agent import ResponseEnrichmentAgent
from utils.llm_client import llm_client

logger = logging.getLogger(__name__)

class EnhancedLangGraphWorkflow:
    """
    Enhanced LangGraph workflow that intelligently handles multi-part queries
    """
    
    def __init__(self, mcp_client):
        self.mcp_client = mcp_client
        
        # Initialize agents
        self.orchestrator = OrchestratorAgent()
        self.query_analyzer = QueryAnalysisAgent()
        self.tool_executor = ToolExecutionAgent(mcp_client)
        self.incident_analyzer = IncidentAnalysisAgent()
        self.response_enricher = ResponseEnrichmentAgent()
        
        # Build the enhanced workflow graph
        self.workflow = self._build_enhanced_workflow_graph()
        
        # App and checkpointer will be initialized async on first use
        self.app = None
        self._checkpointer_context = None
        self._checkpointer = None
    
    async def _ensure_app_initialized(self):
        """Ensure the app is initialized with async SQLite checkpointer"""
        if self.app is None:
            # Create the async context manager
            self._checkpointer_context = AsyncSqliteSaver.from_conn_string("checkpoints.sqlite")
            # Enter the context and get the actual checkpointer
            self._checkpointer = await self._checkpointer_context.__aenter__()
            
            # Setup the checkpointer (creates tables if needed)
            await self._checkpointer.setup()
            
            # Compile with the checkpointer
            self.app = self.workflow.compile(
                checkpointer=self._checkpointer,
                interrupt_before=[],
                interrupt_after=[]
            )
    
    def _build_enhanced_workflow_graph(self) -> StateGraph:
        """Build the enhanced LangGraph state machine workflow"""
        
        # Create the workflow graph
        workflow = StateGraph(ChatState)
        
        # Add nodes for each processing stage
        workflow.add_node("orchestrator_start", self._orchestrator_start_node)
        workflow.add_node("query_analysis", self._query_analysis_node)
        workflow.add_node("clarification_check", self._clarification_node)  # NEW: Ambiguity handler
        workflow.add_node("multi_query_planning", self._multi_query_planning_node)
        workflow.add_node("sequential_execution", self._sequential_execution_node)
        workflow.add_node("parallel_execution", self._parallel_execution_node)
        workflow.add_node("single_query_execution", self._single_query_execution_node)
        workflow.add_node("result_aggregation", self._result_aggregation_node)
        workflow.add_node("incident_analysis", self._incident_analysis_node)
        workflow.add_node("response_enrichment", self._response_enrichment_node)
        workflow.add_node("orchestrator_finish", self._orchestrator_finish_node)
        
        # Set entry point
        workflow.set_entry_point("orchestrator_start")
        
        # Define the main workflow path
        workflow.add_edge("orchestrator_start", "query_analysis")
        
        # CHANGED: Conditional routing after query analysis (ambiguity check)
        workflow.add_conditional_edges(
            "query_analysis",
            self._route_after_analysis,
            {
                "clarification_needed": "clarification_check",
                "proceed": "multi_query_planning"
            }
        )
        
        # NEW: Route clarification responses to finish (returns question to user)
        workflow.add_edge("clarification_check", "orchestrator_finish")
        
        # Conditional routing based on query complexity
        workflow.add_conditional_edges(
            "multi_query_planning",
            self._route_execution_strategy,
            {
                "single": "single_query_execution",
                "sequential": "sequential_execution", 
                "parallel": "parallel_execution"
            }
        )
        
        # All execution paths lead to result aggregation
        workflow.add_edge("single_query_execution", "result_aggregation")
        workflow.add_edge("sequential_execution", "result_aggregation")
        workflow.add_edge("parallel_execution", "result_aggregation")
        
        # Continue normal workflow after aggregation
        workflow.add_conditional_edges(
            "result_aggregation",
            self._route_after_aggregation,
            {
                "incident_analysis": "incident_analysis",
                "response_enrichment": "response_enrichment"
            }
        )
        
        workflow.add_edge("incident_analysis", "response_enrichment")
        workflow.add_edge("response_enrichment", "orchestrator_finish")
        workflow.add_edge("orchestrator_finish", END)
        
        return workflow
    
    # Enhanced Node Implementations
    
    async def _orchestrator_start_node(self, state: ChatState) -> ChatState:
        """Enhanced orchestrator initialization"""
        logger.info("🎯 Enhanced Orchestrator: Starting multi-query capable workflow")
        
        # Get available tools from MCP client  
        client = await self.mcp_client.get_client()
        tools_response = await client.list_available_tools()
        available_tools = [tool.get("name") for tool in tools_response.get("tools", [])]
        logger.info(f"📋 Loaded {len(available_tools)} available MCP tools")
        
        # Add tools to state before orchestrator processing
        state_with_tools = {
            **state,
            "available_tools": available_tools
        }
        
        updated_state = await self.orchestrator.orchestrate_workflow(state_with_tools)
        
        # Delta Pattern: Only return changed fields, NOT messages
        return {
            "workflow_status": "running",
            "investigation_depth": 1,
            "multi_query_results": {},
            "execution_strategy": "unknown",
            "available_tools": available_tools,
            "query_type": updated_state.get("query_type", ""),
            "intent": updated_state.get("intent", ""),
            "current_agent": updated_state.get("current_agent", "orchestrator")
        }
    
    async def _query_analysis_node(self, state: ChatState) -> Dict[str, Any]:
        """Enhanced query analysis with LLM intelligence and ambiguity detection"""
        logger.info("🔍 Enhanced Query Analysis: Analyzing for multi-part queries and ambiguity")
        
        # Get available_tools from state
        available_tools = state.get("available_tools", [])
        
        # Use the enhanced QueryAnalysisAgent
        analyzed_state = await self.query_analyzer.analyze_query(state, available_tools=available_tools)
        
        # Return only changed fields (Delta Pattern) - including ambiguity fields
        return {
            "query_type": analyzed_state["query_type"],
            "intent": analyzed_state["intent"],
            "entities": analyzed_state.get("entities", []),
            "confidence_score": analyzed_state.get("confidence_score", 0.5),
            "specificity_level": analyzed_state.get("specificity_level", "medium"),
            "is_ambiguous": analyzed_state.get("is_ambiguous", False),
            "clarification_question": analyzed_state.get("clarification_question", ""),
            "original_intent": analyzed_state.get("original_intent", ""),
            "current_agent": analyzed_state["current_agent"],
            "context_data": analyzed_state.get("context_data", {})
        }
    
    def _route_after_analysis(self, state: ChatState) -> Literal["clarification_needed", "proceed"]:
        """Route based on ambiguity analysis"""
        if state.get("is_ambiguous", False):
            logger.info("🔀 Routing to clarification (ambiguous query detected)")
            return "clarification_needed"
        logger.info("🔀 Routing to proceed (query is clear)")
        return "proceed"
    
    async def _clarification_node(self, state: ChatState) -> Dict[str, Any]:
        """Ask the user for clarification when query is ambiguous"""
        question = state.get("clarification_question", "Could you please provide more details?")
        logger.info(f"❓ Asking for clarification: {question}")
        
        return {
            "final_response": question,
            "workflow_status": "awaiting_clarification",
            "clarification_count": state.get("clarification_count", 0) + 1
        }
    
    async def _multi_query_planning_node(self, state: ChatState) -> ChatState:
        """Plan execution strategy for single or multi-part queries"""
        logger.info("🎯 Multi-Query Planning: Creating execution strategy")
        
        # Build query analysis from state
        query_analysis = {
            "query_type": state.get("query_type", "general"),
            "intent": state.get("intent", "unknown"),
            "entities": state.get("entities", []),
            "confidence_score": state.get("confidence_score", 0.5),
            "specificity_level": state.get("specificity_level", "medium"),
            "is_multi_part": state.get("context_data", {}).get("query_analysis", {}).get("llm_analysis", {}).get("is_multi_part", False)
        }
        available_tools = state.get("available_tools", [])
        
        logger.info(f"🔎 Query analysis for planning: type={query_analysis['query_type']}, intent={query_analysis['intent']}")
        
        # Get execution plan from LLM
        execution_plan = await llm_client.plan_multi_query_execution(
            user_query=state.get("user_query", ""),
            query_analysis=query_analysis,
            available_tools=available_tools
        )
        
        logger.info(f"📋 Execution Strategy: {execution_plan['execution_type']} with {len(execution_plan['query_plan'])} queries")
        
        # Extract tool plan (with parameters) from execution plan and add to state
        tool_plan = []
        for query_id, query_info in execution_plan.get("query_plan", {}).items():
            tools = query_info.get("tools", [])
            # Tools are already in format [{"name": "tool_name", "parameters": {...}}]
            tool_plan.extend(tools)
        
        logger.info(f"🔧 Tool plan extracted for execution: {len(tool_plan)} tools")
        for tool in tool_plan:
            logger.info(f"   - {tool.get('name', 'unknown')}: {tool.get('parameters', {})}")
        
        return {
            **state,
            "execution_plan": execution_plan,
            "execution_strategy": execution_plan["execution_type"],
            "tool_plan": tool_plan
        }
    
    async def _single_query_execution_node(self, state: ChatState) -> ChatState:
        """Execute single query using standard tool execution"""
        logger.info("⚙️ Single Query Execution")
        
        # Use standard tool execution for single queries
        return await self.tool_executor.execute_tools(state)
    
    async def _sequential_execution_node(self, state: ChatState) -> ChatState:
        """Execute multiple queries sequentially with dependency management"""
        logger.info("🔄 Sequential Multi-Query Execution")
        
        execution_plan = state.get("execution_plan", {})
        query_plan = execution_plan.get("query_plan", {})
        
        multi_query_results = {}
        all_mcp_results = []
        
        # Sort queries by priority and dependencies
        sorted_queries = self._sort_queries_by_dependencies(query_plan)
        
        for query_id in sorted_queries:
            query_info = query_plan[query_id]
            logger.info(f"🎯 Executing sub-query {query_id}: {query_info['query']}")
            
            # Create sub-state for this query
            sub_state = {
                **state,
                "user_query": query_info["query"],
                "tool_plan": query_info["tools"],  # Already contains name + parameters
                "current_tool_index": 0,
                "sub_query_id": query_id
            }
            
            # Execute tools for this sub-query
            sub_result = await self.tool_executor.execute_tools(sub_state)
            
            # Store results
            multi_query_results[query_id] = {
                "query": query_info["query"],
                "tools_used": query_info["tools"],
                "results": sub_result.get("mcp_results", []),
                "success": len([r for r in sub_result.get("mcp_results", []) if r.get("success")]) > 0
            }
            
            # Accumulate all results
            all_mcp_results.extend(sub_result.get("mcp_results", []))
            
            logger.info(f"✅ Sub-query {query_id} completed")
        
        return {
            **state,
            "multi_query_results": multi_query_results,
            "mcp_results": all_mcp_results,
            "executed_tools": [tool for query_result in multi_query_results.values() 
                             for tool in query_result["tools_used"]]
        }
    
    async def _parallel_execution_node(self, state: ChatState) -> ChatState:
        """Execute multiple independent queries in TRUE parallel using asyncio.gather"""
        logger.info("⚡ Parallel Multi-Query Execution with asyncio.gather")
        
        execution_plan = state.get("execution_plan", {})
        query_plan = execution_plan.get("query_plan", {})
        
        # Identify parallelizable queries
        parallel_groups = self._identify_parallel_groups(query_plan)
        
        multi_query_results = {}
        all_mcp_results = []
        
        for group_queries in parallel_groups:
            logger.info(f"🚀 Executing parallel group with {len(group_queries)} queries concurrently")
            
            # Create tasks for parallel execution
            async def execute_sub_query(query_id: str) -> tuple[str, Dict[str, Any]]:
                """Execute a single sub-query and return results"""
                query_info = query_plan[query_id]
                logger.info(f"  ➤ Starting parallel execution of {query_id}")
                
                # Create sub-state for this query
                sub_state = {
                    **state,
                    "user_query": query_info["query"],
                    "tool_plan": query_info["tools"],  # Already contains name + parameters
                    "current_tool_index": 0,
                    "sub_query_id": query_id
                }
                
                # Execute tools for this sub-query
                sub_result = await self.tool_executor.execute_tools(sub_state)
                
                logger.info(f"  ✓ Completed parallel execution of {query_id}")
                
                # Return query_id and results
                return query_id, {
                    "query": query_info["query"],
                    "tools_used": query_info["tools"],
                    "results": sub_result.get("mcp_results", []),
                    "success": len([r for r in sub_result.get("mcp_results", []) if r.get("success")]) > 0
                }
            
            # Execute all queries in this group in TRUE parallel using asyncio.gather
            tasks = [execute_sub_query(query_id) for query_id in group_queries]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"❌ Parallel query execution failed: {result}")
                    continue
                
                query_id, query_result = result
                multi_query_results[query_id] = query_result
                all_mcp_results.extend(query_result["results"])
        
        return {
            **state,
            "multi_query_results": multi_query_results,
            "mcp_results": all_mcp_results,
            "executed_tools": [tool for query_result in multi_query_results.values() 
                             for tool in query_result["tools_used"]]
        }
    
    async def _result_aggregation_node(self, state: ChatState) -> ChatState:
        """Aggregate and correlate results from multiple queries"""
        logger.info("📊 Result Aggregation: Correlating multi-query results")
        
        multi_query_results = state.get("multi_query_results", {})
        
        # If single query, no aggregation needed
        if not multi_query_results:
            return state
        
        # Calculate aggregated metrics
        total_queries = len(multi_query_results)
        successful_queries = len([r for r in multi_query_results.values() if r["success"]])
        total_tools_used = len(state.get("executed_tools", []))
        
        # Create aggregated context
        aggregated_context = {
            "multi_query_summary": {
                "total_queries": total_queries,
                "successful_queries": successful_queries,
                "success_rate": successful_queries / total_queries if total_queries > 0 else 0,
                "total_tools_executed": total_tools_used
            },
            "query_correlation": self._correlate_query_results(multi_query_results),
            "combined_insights": self._extract_combined_insights(multi_query_results)
        }
        
        logger.info(f"📈 Aggregation Complete: {successful_queries}/{total_queries} queries successful")
        
        return {
            **state,
            "aggregated_context": aggregated_context
        }
    
    async def _incident_analysis_node(self, state: ChatState) -> ChatState:
        """Enhanced incident analysis with multi-query context"""
        logger.info("🚨 Enhanced Incident Analysis: Multi-query correlation")
        
        # Use standard incident analysis but with enhanced context
        return await self.incident_analyzer.analyze_incident_data(state)
    
    async def _response_enrichment_node(self, state: ChatState) -> ChatState:
        """Enhanced response enrichment with multi-query insights"""
        logger.info("✨ Enhanced Response Enrichment: Multi-query synthesis")
        
        return await self.response_enricher.enrich_response(state)
    
    async def _orchestrator_finish_node(self, state: ChatState) -> ChatState:
        """Enhanced orchestrator finalization with multi-query summary"""
        logger.info("🎯 Enhanced Orchestrator: Finalizing multi-query workflow")
        
        # Delta Pattern: Build NEW messages to append (reducer will handle merging)
        new_messages = []
        
        # Add user message
        new_messages.append({
            "role": "user",
            "content": state["user_query"]
        })
        
        # Add assistant response
        if state.get("final_response"):
            new_messages.append({
                "role": "assistant",
                "content": state["final_response"]
            })
        
        logger.info(f"💾 Appending {len(new_messages)} new messages to conversation history")
        
        # CRITICAL FIX: Do not overwrite special statuses like 'awaiting_clarification'
        current_status = state.get("workflow_status")
        final_status = "completed"
        
        if current_status == "awaiting_clarification":
            final_status = "awaiting_clarification"
        elif current_status == "failed":
            final_status = "failed"
        
        # Delta Pattern: Return only NEW messages and changed fields
        result = {
            "messages": new_messages,  # Reducer will append these to existing history
            "workflow_status": final_status,  # Use conditional status
            "completion_timestamp": datetime.now().isoformat()
        }
        
        # Add multi-query summary if applicable
        if state.get("multi_query_results"):
            result["multi_query_summary"] = state.get("aggregated_context", {}).get("multi_query_summary", {})
        
        return result
    
    # Enhanced Routing Functions
    
    def _route_execution_strategy(self, state: ChatState) -> Literal["single", "sequential", "parallel"]:
        """Route based on execution strategy determined in planning"""
        execution_strategy = state.get("execution_strategy", "single")
        
        if execution_strategy == "mixed":
            # For mixed strategies, default to sequential for safety
            return "sequential"
        
        return execution_strategy
    
    def _route_after_aggregation(self, state: ChatState) -> Literal["incident_analysis", "response_enrichment"]:
        """Enhanced routing after result aggregation"""
        # Check if any results indicate incident data
        mcp_results = state.get("mcp_results", [])
        
        for result in mcp_results:
            if result.get("success") and result.get("tool_name") in ["get_incidents", "search_incidents"]:
                logger.info("🚨 Routing to incident analysis based on incident data found")
                return "incident_analysis"
        
        # Check query type from analysis
        query_analysis = state.get("query_analysis", {})
        if query_analysis.get("query_type") in ["incident_analysis", "root_cause"]:
            return "incident_analysis"
        
        logger.info("✨ Routing to response enrichment")
        return "response_enrichment"
    
    # Helper Methods for Multi-Query Processing
    
    def _sort_queries_by_dependencies(self, query_plan: Dict[str, Any]) -> List[str]:
        """Sort queries by priority and dependencies"""
        # Simple priority-based sorting for now
        # In a more complex implementation, this would do topological sorting of dependencies
        
        queries_with_priority = [(query_id, info.get("priority", 999)) 
                                for query_id, info in query_plan.items()]
        
        # Sort by priority (lower number = higher priority)
        sorted_queries = sorted(queries_with_priority, key=lambda x: x[1])
        
        return [query_id for query_id, _ in sorted_queries]
    
    def _identify_parallel_groups(self, query_plan: Dict[str, Any]) -> List[List[str]]:
        """Identify groups of queries that can be executed in parallel"""
        # Simplified implementation - in practice would analyze dependencies
        
        # For now, group by priority level
        priority_groups = {}
        for query_id, info in query_plan.items():
            priority = info.get("priority", 1)
            if priority not in priority_groups:
                priority_groups[priority] = []
            priority_groups[priority].append(query_id)
        
        # Return groups in priority order
        return [priority_groups[priority] for priority in sorted(priority_groups.keys())]
    
    def _correlate_query_results(self, multi_query_results: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze correlations between different query results"""
        
        correlations = {
            "cross_references": [],
            "common_entities": [],
            "timeline_overlaps": []
        }
        
        # Simple correlation analysis
        query_ids = list(multi_query_results.keys())
        
        for i, query_id_1 in enumerate(query_ids):
            for query_id_2 in query_ids[i+1:]:
                result_1 = multi_query_results[query_id_1]
                result_2 = multi_query_results[query_id_2]
                
                # Check for common tool usage (indicates related data domains)
                common_tools = set(result_1["tools_used"]) & set(result_2["tools_used"])
                if common_tools:
                    correlations["cross_references"].append({
                        "query_1": query_id_1,
                        "query_2": query_id_2,
                        "common_tools": list(common_tools),
                        "correlation_strength": len(common_tools) / max(len(result_1["tools_used"]), len(result_2["tools_used"]))
                    })
        
        return correlations
    
    def _extract_combined_insights(self, multi_query_results: Dict[str, Any]) -> Dict[str, Any]:
        """Extract insights that span multiple queries"""
        
        insights = {
            "data_completeness": 0.0,
            "coverage_analysis": {},
            "key_patterns": []
        }
        
        # Calculate data completeness
        successful_queries = [r for r in multi_query_results.values() if r["success"]]
        insights["data_completeness"] = len(successful_queries) / len(multi_query_results)
        
        # Analyze tool coverage
        all_tools = set()
        for result in multi_query_results.values():
            all_tools.update(result["tools_used"])
        
        insights["coverage_analysis"] = {
            "unique_tools_used": len(all_tools),
            "total_tool_executions": sum(len(r["tools_used"]) for r in multi_query_results.values()),
            "tool_diversity": len(all_tools) / sum(len(r["tools_used"]) for r in multi_query_results.values()) if multi_query_results else 0
        }
        
        return insights
    
    # Main Processing Method
    
    async def process_query(self, user_query: str, session_id: str = None) -> Dict[str, Any]:
        """
        Enhanced query processing that handles both single and multi-part queries
        """
        try:
            # Ensure app is initialized with async checkpointer
            await self._ensure_app_initialized()
            
            logger.info(f"🚀 Enhanced Processing: '{user_query}'")
            
            # Detect if this might be a multi-part query
            if self._is_likely_multi_query(user_query):
                logger.info("🔀 Potential multi-part query detected")
            
            # Determine thread_id for state persistence
            thread_id = session_id or f"session_{datetime.now().timestamp()}"
            
            # For NEW sessions, create initial state
            # For EXISTING sessions, checkpointer will load previous state
            # We only pass the new user_query
            try:
                # Try to get existing state from checkpointer
                existing_state = await self.app.aget_state(config={
                    "configurable": {"thread_id": thread_id}
                })
                
                if existing_state.values:  # State exists, just update query
                    logger.info(f"📂 Loading existing state for session {thread_id}")
                    # Track the starting count of results to filter later
                    previous_results_count = len(existing_state.values.get("mcp_results", []))
                    input_data = {
                        "user_query": user_query,
                        "session_id": thread_id,
                        "_previous_results_count": previous_results_count  # Track for filtering
                    }
                else:  # New session, create initial state
                    logger.info(f"🆕 Creating new state for session {thread_id}")
                    input_data = create_initial_state(user_query, thread_id)
                    input_data["_previous_results_count"] = 0  # No previous results
                    
            except Exception as e:
                # If checkpointer fails, create new state
                logger.warning(f"⚠️ Couldn't load existing state: {e}. Creating new state.")
                input_data = create_initial_state(user_query, thread_id)
            
            # Execute the enhanced workflow
            result = await self.app.ainvoke(
                input_data,
                config={
                    "configurable": {
                        "thread_id": thread_id
                    }
                }
            )
            
            # Format enhanced response
            response = self._format_enhanced_response(result)
            
            logger.info(f"✅ Enhanced processing completed successfully")
            return response
            
        except Exception as e:
            logger.error(f"❌ Enhanced query processing failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "response": "I encountered an error while processing your request. Please try again.",
                "details": {}
            }
    
    def _is_likely_multi_query(self, user_query: str) -> bool:
        """Quick heuristic to detect potential multi-part queries"""
        indicators = ["and", "also", "then", "next", "additionally", "furthermore", "?", ";", "1.", "2.", "first", "second"]
        
        query_lower = user_query.lower()
        indicator_count = sum(1 for indicator in indicators if indicator in query_lower)
        
        # Simple heuristic: if multiple indicators or very long query
        return indicator_count >= 2 or len(user_query) > 200
    
    def _format_enhanced_response(self, final_state: ChatState) -> Dict[str, Any]:
        """Format enhanced response with multi-query information"""
        
        # Handle case where final_state is not a dict (error state)
        if not isinstance(final_state, dict):
            logger.warning(f"⚠️ final_state is not a dict, type={type(final_state)}")
            return {
                "success": False,
                "response": str(final_state) if final_state else "Processing failed",
                "query_analysis": {"query_type": "unknown", "intent": "unknown", "confidence_score": 0, "is_multi_part": False},
                "execution_summary": {"execution_strategy": "unknown", "tools_executed": 0, "success_rate": 0.0},
                "enrichment": {},
                "session_info": {"session_id": None, "request_id": None, "timestamp": None}
            }
        
        # Start with standard response format
        response = {
            "success": final_state.get("workflow_status") == "completed",
            "response": final_state.get("final_response", "Analysis completed"),
            "query_analysis": {
                "query_type": final_state.get("query_type"),
                "intent": final_state.get("intent"),
                "confidence_score": final_state.get("confidence_score", 0),
                "is_multi_part": final_state.get("query_analysis", {}).get("is_multi_part", False)
            },
            "execution_summary": {
                "execution_strategy": final_state.get("execution_strategy", "single"),
                "tools_executed": len(final_state.get("executed_tools", [])),
                "success_rate": self._calculate_success_rate(final_state)
            }
        }
        
        # Add multi-query specific information
        if final_state.get("multi_query_results"):
            response["multi_query_analysis"] = {
                "sub_queries_processed": len(final_state.get("multi_query_results", {})),
                "aggregated_context": final_state.get("aggregated_context", {}),
                "cross_correlations": len(final_state.get("aggregated_context", {}).get("query_correlation", {}).get("cross_references", []))
            }
        
        # Add standard fields
        # Only return tools executed for the CURRENT query, not conversation history
        all_results = final_state.get("mcp_results", [])
        previous_count = final_state.get("_previous_results_count", 0)
        
        # Get only the results added during this query (after previous_count)
        current_query_results = all_results[previous_count:] if previous_count < len(all_results) else all_results
        
        response.update({
            "enrichment": final_state.get("enrichment_data", {}),
            "session_info": {
                "session_id": final_state.get("session_id"),
                "request_id": final_state.get("request_id"),
                "timestamp": final_state.get("completion_timestamp")
            },
            "executed_tools": current_query_results  # Only current query results
        })
        
        return response
    
    def _calculate_success_rate(self, state: ChatState) -> float:
        """Calculate success rate for multi-query execution"""
        mcp_results = state.get("mcp_results", [])
        if not mcp_results:
            return 0.0
        
        successful = sum(1 for result in mcp_results if result.get("success"))
        return successful / len(mcp_results)