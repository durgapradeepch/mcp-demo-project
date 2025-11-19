"""
Tool Execution Agent - Executes MCP tools and manages the execution workflow
"""

import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
from state import ChatState, add_mcp_result, update_state_context

logger = logging.getLogger(__name__)

class ToolExecutionAgent:
    """
    Specialized agent for executing MCP tools in the correct sequence
    and managing the execution workflow with error handling and retries
    """
    
    def __init__(self, mcp_client):
        self.name = "ToolExecutionAgent"
        self.mcp_client = mcp_client
        
        # Tool execution configuration
        self.execution_config = {
            "max_retries": 3,
            "retry_delay": 1.0,
            "timeout_per_tool": 30.0,
            "parallel_execution": True,
            "max_parallel_tools": 3
        }
        
        # Tool dependency mapping
        self.tool_dependencies = {
            "get_incident_changelogs": ["get_incident_by_id"],
            "get_resource_tickets": ["get_resource_by_id"],
            "search_changelogs_by_resource_id": ["get_resource_by_id"]
        }
    
    async def execute_tools(self, state: ChatState) -> ChatState:
        """Main tool execution orchestration"""
        try:
            # Skip tool execution for conversational queries
            if state.get("query_type") == "conversational":
                logger.info("💬 Skipping tool execution for conversational query")
                return {
                    **state,
                    "workflow_status": "completed",
                    "current_agent": self.name
                }
            
            logger.info(f"🛠️ Executing {len(state['tool_plan'])} tools")
            
            # Execute tools according to plan (which includes parameters)
            results = []
            current_state = state
            
            for tool_info in state["tool_plan"]:
                # tool_info is already {"name": str, "parameters": Dict[str, Any]}
                tool_result = await self._execute_single_tool_with_retry(tool_info, current_state)
                
                # Add result to state
                current_state = add_mcp_result(current_state, tool_info["name"], tool_result, self.name)
                results.append(tool_result)
            
            # Calculate execution statistics
            execution_stats = self._calculate_execution_stats(results)
            current_state = update_state_context(current_state, "execution_stats", execution_stats)
            
            logger.info(f"✅ Tool execution completed: {execution_stats['success_rate']:.2%} success rate")
            
            # FIX: Remove messages to prevent duplication in LangGraph reducer
            if "messages" in current_state:
                del current_state["messages"]
            
            return current_state
            
        except Exception as e:
            logger.error(f"❌ Tool execution failed: {str(e)}")
            return {
                **state,
                "error_count": state.get("error_count", 0) + 1,
                "workflow_status": "degraded"
            }
    
    async def _execute_single_tool_with_retry(self, tool_info: Dict[str, Any], 
                                            state: ChatState) -> Dict[str, Any]:
        """Execute a single tool with retry logic"""
        
        tool_name = tool_info.get("name")
        parameters = tool_info.get("parameters", {})
        max_retries = self.execution_config["max_retries"]
        retry_delay = self.execution_config["retry_delay"]
        timeout = self.execution_config["timeout_per_tool"]
        
        logger.info(f"🔧 Executing {tool_name} with parameters: {parameters}")
        
        last_error = None
        
        for attempt in range(max_retries + 1):
            try:
                if attempt > 0:
                    logger.info(f"🔄 Retrying {tool_name} (attempt {attempt + 1}/{max_retries + 1})")
                    await asyncio.sleep(retry_delay * attempt)  # Exponential backoff
                
                # Get MCP client and execute the tool
                client = await self.mcp_client.get_client()
                result = await asyncio.wait_for(
                    client.execute_tool(tool_name, parameters),
                    timeout=timeout
                )
                
                logger.info(f"✅ Tool {tool_name} executed successfully")
                return {"success": True, "data": result, "attempts": attempt + 1}
                
            except asyncio.TimeoutError:
                last_error = f"Tool execution timed out after {timeout}s"
                logger.warning(f"⏰ Tool {tool_name} timed out on attempt {attempt + 1}")
                
            except Exception as e:
                last_error = str(e)
                logger.warning(f"⚠️ Tool {tool_name} failed on attempt {attempt + 1}: {str(e)}")
        
        # All retries failed
        logger.error(f"❌ Tool {tool_name} failed after {max_retries + 1} attempts: {last_error}")
        return {"success": False, "error": last_error, "attempts": max_retries + 1}
    
    def _calculate_execution_stats(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate execution statistics"""
        
        total_tools = len(results)
        successful_tools = sum(1 for result in results if result.get("success"))
        
        return {
            "total_tools": total_tools,
            "successful_tools": successful_tools,
            "failed_tools": total_tools - successful_tools,
            "success_rate": successful_tools / total_tools if total_tools > 0 else 0,
            "total_attempts": sum(result.get("attempts", 1) for result in results),
            "average_attempts": sum(result.get("attempts", 1) for result in results) / total_tools if total_tools > 0 else 0
        }