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
            logger.info(f"🛠️ Executing {len(state['tool_sequence'])} tools")
            
            # Plan execution order considering dependencies
            execution_plan = self._create_execution_plan(state["tool_sequence"], state)
            
            # Execute tools according to plan
            results = []
            current_state = state
            
            for execution_batch in execution_plan:
                batch_results = await self._execute_tool_batch(execution_batch, current_state)
                
                # Add results to state
                for tool_name, result in batch_results.items():
                    current_state = add_mcp_result(current_state, tool_name, result, self.name)
                
                results.extend(batch_results.values())
                
                # Update context for next batch
                current_state = self._update_execution_context(current_state, batch_results)
            
            # Calculate execution statistics
            execution_stats = self._calculate_execution_stats(results)
            current_state = update_state_context(current_state, "execution_stats", execution_stats)
            
            logger.info(f"✅ Tool execution completed: {execution_stats['success_rate']:.2%} success rate")
            
            return current_state
            
        except Exception as e:
            logger.error(f"❌ Tool execution failed: {str(e)}")
            return {
                **state,
                "error_count": state.get("error_count", 0) + 1,
                "workflow_status": "degraded"
            }
    
    def _create_execution_plan(self, tool_sequence: List[str], state: ChatState) -> List[List[Dict[str, Any]]]:
        """Create execution plan considering dependencies and context"""
        
        execution_plan = []
        remaining_tools = tool_sequence.copy()
        context = state.get("context_data", {})
        
        while remaining_tools:
            # Find tools that can be executed in this batch
            executable_tools = []
            
            for tool in remaining_tools:
                if self._can_execute_tool(tool, state, executed_tools=[]):
                    # Build tool execution info
                    tool_info = {
                        "name": tool,
                        "parameters": self._build_tool_parameters(tool, context),
                        "priority": self._get_tool_priority(tool, state),
                        "timeout": self.execution_config["timeout_per_tool"]
                    }
                    executable_tools.append(tool_info)
            
            if not executable_tools:
                # Break dependency deadlock by executing remaining tools anyway
                logger.warning("⚠️ Dependency deadlock detected, executing remaining tools")
                executable_tools = [
                    {
                        "name": tool,
                        "parameters": self._build_tool_parameters(tool, context),
                        "priority": 1,
                        "timeout": self.execution_config["timeout_per_tool"]
                    }
                    for tool in remaining_tools
                ]
            
            # Sort by priority and limit batch size
            executable_tools.sort(key=lambda x: x["priority"], reverse=True)
            batch = executable_tools[:self.execution_config["max_parallel_tools"]]
            
            execution_plan.append(batch)
            
            # Remove executed tools from remaining
            executed_in_batch = [tool["name"] for tool in batch]
            remaining_tools = [tool for tool in remaining_tools if tool not in executed_in_batch]
        
        return execution_plan
    
    async def _execute_tool_batch(self, tool_batch: List[Dict[str, Any]], 
                                 state: ChatState) -> Dict[str, Any]:
        """Execute a batch of tools in parallel"""
        
        batch_results = {}
        
        if self.execution_config["parallel_execution"] and len(tool_batch) > 1:
            # Parallel execution
            tasks = []
            for tool_info in tool_batch:
                task = asyncio.create_task(
                    self._execute_single_tool_with_retry(tool_info, state)
                )
                tasks.append((tool_info["name"], task))
            
            # Wait for all tasks to complete
            for tool_name, task in tasks:
                try:
                    result = await task
                    batch_results[tool_name] = result
                except Exception as e:
                    logger.error(f"❌ Tool {tool_name} failed in batch: {str(e)}")
                    batch_results[tool_name] = {"error": str(e), "success": False}
        else:
            # Sequential execution
            for tool_info in tool_batch:
                try:
                    result = await self._execute_single_tool_with_retry(tool_info, state)
                    batch_results[tool_info["name"]] = result
                except Exception as e:
                    logger.error(f"❌ Tool {tool_info['name']} failed: {str(e)}")
                    batch_results[tool_info["name"]] = {"error": str(e), "success": False}
        
        return batch_results
    
    async def _execute_single_tool_with_retry(self, tool_info: Dict[str, Any], 
                                            state: ChatState) -> Dict[str, Any]:
        """Execute a single tool with retry logic"""
        
        tool_name = tool_info["name"]
        parameters = tool_info["parameters"]
        max_retries = self.execution_config["max_retries"]
        retry_delay = self.execution_config["retry_delay"]
        
        last_error = None
        
        for attempt in range(max_retries + 1):
            try:
                if attempt > 0:
                    logger.info(f"🔄 Retrying {tool_name} (attempt {attempt + 1}/{max_retries + 1})")
                    await asyncio.sleep(retry_delay * attempt)  # Exponential backoff
                
                # Execute the tool
                result = await asyncio.wait_for(
                    self.mcp_client.execute_tool_managed(tool_name, parameters),
                    timeout=tool_info["timeout"]
                )
                
                logger.info(f"✅ Tool {tool_name} executed successfully")
                return {"success": True, "data": result, "attempts": attempt + 1}
                
            except asyncio.TimeoutError:
                last_error = f"Tool execution timed out after {tool_info['timeout']}s"
                logger.warning(f"⏰ Tool {tool_name} timed out on attempt {attempt + 1}")
                
            except Exception as e:
                last_error = str(e)
                logger.warning(f"⚠️ Tool {tool_name} failed on attempt {attempt + 1}: {str(e)}")
        
        # All retries failed
        logger.error(f"❌ Tool {tool_name} failed after {max_retries + 1} attempts: {last_error}")
        return {"success": False, "error": last_error, "attempts": max_retries + 1}
    
    def _can_execute_tool(self, tool_name: str, state: ChatState, executed_tools: List[str]) -> bool:
        """Check if a tool can be executed based on dependencies"""
        
        dependencies = self.tool_dependencies.get(tool_name, [])
        
        for dependency in dependencies:
            if dependency not in executed_tools and dependency not in state.get("executed_tools", []):
                return False
        
        return True
    
    def _build_tool_parameters(self, tool_name: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Build parameters for tool execution based on context"""
        
        # Default parameters
        params = {}
        
        # Tool-specific parameter building
        if tool_name == "search_logs":
            if "error_timestamp" in context:
                params["query"] = f"level:ERROR AND _time:{context['error_timestamp']}"
            else:
                params["query"] = "level:ERROR"
            params["limit"] = 50
        
        elif tool_name == "get_incidents":
            params["status"] = "open"
            params["limit"] = 20
        
        elif tool_name == "search_changelogs":
            if "resource_id" in context:
                params["resource_id"] = context["resource_id"]
            params["limit"] = 30
        
        elif tool_name == "get_incident_by_id":
            if "incident_id" in context:
                params["incident_id"] = context["incident_id"]
        
        elif tool_name == "get_resource_by_id":
            if "resource_id" in context:
                params["resource_id"] = context["resource_id"]
        
        elif "get_schema" == tool_name or "get_node_labels" == tool_name:
            # These tools don't need parameters
            pass
        
        return params
    
    def _get_tool_priority(self, tool_name: str, state: ChatState) -> int:
        """Determine execution priority for tools"""
        
        query_type = state.get("query_type", "general")
        
        # High priority tools for incident analysis
        if query_type == "incident_analysis":
            high_priority_tools = ["search_logs", "get_incidents", "search_changelogs"]
            if tool_name in high_priority_tools:
                return 3
        
        # Medium priority for supporting tools
        supporting_tools = ["get_resource_by_id", "get_incident_changelogs"]
        if tool_name in supporting_tools:
            return 2
        
        # Low priority for exploratory tools
        return 1
    
    def _update_execution_context(self, state: ChatState, batch_results: Dict[str, Any]) -> ChatState:
        """Update execution context based on batch results"""
        
        context = state.get("context_data", {}).copy()
        
        # Extract useful data from results for next batch
        for tool_name, result in batch_results.items():
            if result.get("success") and result.get("data"):
                data = result["data"]
                
                # Extract resource IDs
                if tool_name == "get_incidents" and isinstance(data, dict):
                    incidents = data.get("incidents", [])
                    if incidents and isinstance(incidents, list):
                        for incident in incidents[:3]:  # Take first 3
                            if isinstance(incident, dict) and "resource_id" in incident:
                                context["resource_id"] = incident["resource_id"]
                                break
                
                # Extract incident IDs
                if "incident" in data and isinstance(data.get("incident"), dict):
                    context["incident_id"] = data["incident"].get("id")
                
                # Extract timestamps
                if "timestamp" in data:
                    context["error_timestamp"] = data["timestamp"]
        
        return update_state_context(state, "execution_context", context)
    
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