"""
Tool Execution Agent - Executes MCP tools and manages the execution workflow
"""

import logging
import asyncio
import copy  # For deep copying to prevent state mutation
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
        
        # 1. Static Dependencies (Explicit hardcoded links)
        self.tool_dependencies = {
            "get_incident_changelogs": ["get_incident_by_id"],
            "get_resource_tickets": ["get_resource_by_id"],
            "search_changelogs_by_resource_id": ["get_resource_by_id"],
            "analyze_incident": ["get_incident_by_id"],
            "get_incident_resources": ["get_incident_by_id"]
        }
        
        # 2. Dynamic Domain Mappings (Universal Logic)
        # Maps a "Parameter Name" to the tools that PRODUCE that ID
        self.domain_mappings = {
            "incident_id": ["get_incidents", "search_incidents", "get_incident_by_id"],
            "ticket_id": ["get_tickets", "search_tickets", "get_resource_tickets"],
            "resource_id": ["get_resources", "search_resources", "get_notifications"],
            "changelog_id": ["get_changelogs", "search_changelogs"],
            "notification_id": ["get_notifications"]
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
            # CRITICAL BUG FIX: Use deepcopy to prevent state mutation
            # dict.copy() is SHALLOW - nested objects like context_data["execution_stats"]
            # would still share references, causing mutations to leak to other branches
            # in parallel LangGraph execution. deepcopy ensures complete isolation.
            current_state = copy.deepcopy(state)
            
            # Check if tools have dependencies or if parallel execution is enabled
            if self.execution_config["parallel_execution"] and self._can_parallelize(state["tool_plan"]):
                logger.info("⚡ Executing tools in parallel")
                # Execute all tools concurrently
                tasks = [self._execute_single_tool_with_retry(tool_info, state) for tool_info in state["tool_plan"]]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Add all results to state
                for tool_info, tool_result in zip(state["tool_plan"], results):
                    if isinstance(tool_result, Exception):
                        tool_result = {"success": False, "error": str(tool_result), "attempts": 1}
                    current_state = add_mcp_result(current_state, tool_info["name"], tool_result, self.name)
            else:
                logger.info("🔄 Executing tools sequentially (dependencies detected or parallel disabled)")
                # Sort tools topologically based on dependencies
                sorted_tools = self._topological_sort(state["tool_plan"])
                logger.info(f"📊 Tool execution order: {[t['name'] for t in sorted_tools]}")
                
                # Sequential execution in dependency order
                executed_tool_names = []
                for tool_info in sorted_tools:
                    # tool_info is already {"name": str, "parameters": Dict[str, Any]}
                    tool_result = await self._execute_single_tool_with_retry(tool_info, current_state)
                    
                    # Add result to state
                    current_state = add_mcp_result(current_state, tool_info["name"], tool_result, self.name)
                    results.append(tool_result)
                    executed_tool_names.append(tool_info["name"])
                    
                    # After first tool, check if we need batch processing for next tool
                    # (e.g., get_incidents returned multiple IDs for get_incident_by_id)
                    if tool_info["name"] in ["get_incidents", "search_incidents"] and tool_result.get("success"):
                        # Check if next tool needs batch processing
                        remaining_tools = [t for t in sorted_tools if t["name"] not in executed_tool_names]
                        if remaining_tools:
                            next_tool = remaining_tools[0]
                            if next_tool["name"] in ["get_incident_by_id", "get_incident_curated"]:
                                # Extract incident IDs for batch processing
                                batch_ids = self._extract_value_from_results("incident_id", current_state)
                                if isinstance(batch_ids, list) and len(batch_ids) > 1:
                                    current_state["batch_incident_ids"] = batch_ids
                                    logger.info(f"✅ Prepared batch processing for {len(batch_ids)} incidents")
                    
                    # Check if batch processing is needed
                    logger.info(f"🔍 Batch check: batch_incident_ids in state={('batch_incident_ids' in current_state)}, tool_name={tool_info['name']}")
                    if "batch_incident_ids" in current_state and tool_info["name"] in ["get_incident_by_id", "get_incident_curated"]:
                        batch_ids = current_state["batch_incident_ids"]
                        logger.info(f"🔄 Batch processing {len(batch_ids)} incidents for {tool_info['name']}")
                        
                        # Execute for remaining IDs (first one already done)
                        for incident_id in batch_ids[1:]:
                            batch_tool_info = {
                                "name": tool_info["name"],
                                "parameters": {"incident_id": incident_id}
                            }
                            batch_result = await self._execute_single_tool_with_retry(batch_tool_info, current_state)
                            current_state = add_mcp_result(current_state, tool_info["name"], batch_result, self.name)
                            results.append(batch_result)
                            logger.info(f"  ✅ Processed incident {incident_id}")
                        
                        # Clear batch flag
                        del current_state["batch_incident_ids"]
                        logger.info(f"✅ Batch processing completed for {len(batch_ids)} incidents")
            
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
        
        # CRITICAL FIX: Resolve parameter placeholders from previous step results
        # Pass tool_name in state for context-aware resolution
        state_with_tool = {**state, "current_tool_name": tool_name}
        resolved_params = self._resolve_parameter_placeholders(parameters, state_with_tool)
        
        # If resolution removed all parameters and tool requires them, skip execution
        if resolved_params is None:
            logger.error(f"❌ Skipping {tool_name} - required parameters could not be resolved")
            return {
                "success": False, 
                "error": f"Required parameters for {tool_name} could not be resolved from previous results",
                "attempts": 0
            }
        
        parameters = resolved_params
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
    
    def _resolve_parameter_placeholders(self, parameters: Dict[str, Any], state: ChatState) -> Optional[Dict[str, Any]]:
        """Resolve parameter placeholders like 'id_from_step_1' with actual values from previous results
        
        Returns:
            Dict with resolved parameters, or None if required parameters couldn't be resolved
        """
        tool_name = state.get("current_tool_name", "")
        
        # Special case: empty parameters for incident tools - try to infer from context
        if not parameters and "incident" in tool_name.lower():
            logger.info(f"🔍 Tool {tool_name} called with empty parameters, attempting to resolve from context")
            # Try to get incident_id from previous results
            incident_id = self._extract_value_from_results("incident_id", state)
            if incident_id:
                # Check if it's a list (batch operation)
                if isinstance(incident_id, list):
                    logger.info(f"✅ Resolved {len(incident_id)} incident_ids for batch operation")
                    state["batch_incident_ids"] = incident_id  # Store for batch processing
                    return {"incident_id": incident_id[0]}  # Return first for this call
                else:
                    logger.info(f"✅ Resolved incident_id from context: {incident_id}")
                    return {"incident_id": incident_id}
            else:
                logger.error(f"❌ Cannot execute {tool_name} - no incident_id found in context")
                return None
        
        if not parameters:
            return parameters
        
        resolved_params = {}
        failed_to_resolve = []
        
        for key, value in parameters.items():
            # Check if value is a placeholder string pattern or problematic value
            if isinstance(value, str) and (
                '_from_step_' in value or 
                'step_' in value or 
                value.startswith('id_') or
                value in ('undefined', 'null', 'None', '')
            ):
                # Try to extract actual values from previous tool results
                resolved_value = self._extract_value_from_results(key, state)
                if resolved_value is not None:
                    logger.info(f"✅ Resolved {key}='{value}' -> {resolved_value}")
                    resolved_params[key] = resolved_value
                else:
                    logger.warning(f"⚠️ Could not resolve {key}='{value}'")
                    failed_to_resolve.append(key)
            else:
                resolved_params[key] = value
        
        # If we couldn't resolve critical parameters, return None to skip execution
        if failed_to_resolve:
            logger.error(f"❌ Failed to resolve required parameters: {failed_to_resolve}")
            return None
            
        return resolved_params
    
    def _extract_value_from_results(self, param_key: str, state: ChatState) -> Optional[Any]:
        """Extract IDs from previous results based on domain patterns"""
        try:
            mcp_results = state.get("mcp_results", [])
            if not mcp_results:
                logger.warning("⚠️ No mcp_results in state to extract values from")
                return None
            
            logger.info(f"🔍 Extracting {param_key} from {len(mcp_results)} mcp_results")
            
            # Look through results in reverse order (newest first)
            for idx, result_entry in enumerate(reversed(mcp_results)):
                if not result_entry.get("success"):
                    continue
                
                tool_name = result_entry.get("tool_name")
                data = result_entry.get("result", {})
                
                logger.info(f"🔍 Checking mcp_result {idx}: tool={tool_name}, success={result_entry.get('success')}")
                logger.info(f"🔍 Raw data type: {type(data)}, has 'data' key: {'data' in data if isinstance(data, dict) else 'N/A'}, has 'result' key: {'result' in data if isinstance(data, dict) else 'N/A'}")
                
                # Handle nested "data" or "result" wrappers common in MCP
                if isinstance(data, dict) and "data" in data:
                    nested = data["data"]
                    if nested is not None:
                        data = nested
                        logger.info(f"🔍 Unwrapped 'data' layer, new type: {type(data)}")
                if isinstance(data, dict) and "result" in data:
                    nested = data["result"]
                    if nested is not None:
                        data = nested
                        logger.info(f"🔍 Unwrapped 'result' layer, new type: {type(data)}")
                
                # Safety check: ensure data is still valid
                if data is None:
                    logger.warning(f"⚠️ Data is None after unwrapping for {tool_name}")
                    continue
                
                logger.info(f"🔍 Final data type: {type(data)}, is dict: {isinstance(data, dict)}, is list: {isinstance(data, list)}")
                if isinstance(data, dict):
                    logger.info(f"🔍 Dict keys: {list(data.keys())[:10]}")
                elif isinstance(data, list):
                    logger.info(f"🔍 List length: {len(data)}")
                
                # --- DOMAIN EXTRACTION LOGIC ---
                
                # Case 1: Resources (returns 'resourceId' string or 'id' int)
                if param_key == "resource_id":
                    # Check for list response (search_resources)
                    if isinstance(data, list) and data:
                        resource_id = data[0].get("resourceId") or data[0].get("id")
                        if resource_id:
                            logger.info(f"📋 Found resource_id from {tool_name}: {resource_id}")
                            return resource_id
                    # Check for object response (get_resource_by_id)
                    if isinstance(data, dict):
                        if "resources" in data and data["resources"]:
                            resource_id = data["resources"][0].get("resourceId") or data["resources"][0].get("id")
                            if resource_id:
                                logger.info(f"📋 Found resource_id from {tool_name}: {resource_id}")
                                return resource_id
                        resource_id = data.get("resourceId") or data.get("id")
                        if resource_id:
                            logger.info(f"📋 Found resource_id from {tool_name}: {resource_id}")
                            return resource_id
                
                # Case 2: Incidents (returns 'id' int)
                elif param_key == "incident_id":
                    if isinstance(data, list) and data:
                        # Filter out None values first
                        valid_incidents = [inc for inc in data if inc is not None and isinstance(inc, dict)]
                        if not valid_incidents:
                            logger.warning(f"⚠️ No valid incident dicts in list from {tool_name}")
                            continue
                        # Prioritize incidents with metadata.summary.rca
                        incidents_with_rca = [
                            inc for inc in valid_incidents 
                            if (inc.get("metadata") or {}).get("summary", {}).get("rca")
                        ]
                        if incidents_with_rca:
                            incident_id = incidents_with_rca[0].get("id")
                            logger.info(f"📋 Found {len(incidents_with_rca)} incidents with RCA from {tool_name}, using first: {incident_id}")
                            return incident_id
                        # Fallback to first incident if none have RCA
                        incident_id = valid_incidents[0].get("id")
                        if incident_id:
                            logger.info(f"📋 Found incident_id from {tool_name} (no RCA): {incident_id}")
                            return incident_id
                    if isinstance(data, dict):
                        if "incidents" in data and data["incidents"]:
                            # Prioritize incidents with metadata.summary.rca
                            incidents = data["incidents"]
                            if not isinstance(incidents, list):
                                logger.warning(f"⚠️ 'incidents' is not a list: {type(incidents)}")
                                continue
                            # Filter out None values
                            incidents = [inc for inc in incidents if inc is not None and isinstance(inc, dict)]
                            if not incidents:
                                logger.warning(f"⚠️ No valid incident dicts found")
                                continue
                            logger.info(f"🔍 Filtered to {len(incidents)} valid incidents, checking for RCA...")
                            incidents_with_rca = [
                                inc for inc in incidents 
                                if inc is not None and isinstance(inc, dict) and 
                                (inc.get("metadata") or {}).get("summary", {}).get("rca")
                            ]
                            
                            # Check if we need multiple IDs (for "top N" queries)
                            # Look for limit in tool_plan parameters
                            limit = 1
                            tool_plan = state.get("tool_plan", [])
                            logger.info(f"🔍 Looking for limit in tool_plan with {len(tool_plan)} tools for tool_name={tool_name}")
                            for tool_info in tool_plan:
                                logger.info(f"  - Checking tool: {tool_info.get('name')}")
                                if tool_info.get("name") == tool_name:
                                    params = tool_info.get("parameters", {})
                                    limit = params.get("limit", 1)
                                    logger.info(f"🔍 Found limit={limit} in tool parameters for {tool_name}")
                                    break
                            
                            # Return multiple IDs if limit > 1
                            if limit > 1:
                                # Prioritize incidents with RCA, then others
                                selected = incidents_with_rca[:limit] if incidents_with_rca else incidents[:limit]
                                incident_ids = [inc.get("id") for inc in selected if inc.get("id")]
                                if incident_ids:
                                    logger.info(f"📋 Found {len(incident_ids)} incident IDs for batch operation: {incident_ids}")
                                    return incident_ids  # Return list for batch processing
                            
                            # Single ID fallback
                            if incidents_with_rca:
                                incident_id = incidents_with_rca[0].get("id")
                                logger.info(f"📋 Found {len(incidents_with_rca)}/{len(incidents)} incidents with RCA from {tool_name}, using first: {incident_id}")
                                return incident_id
                            # Fallback to first incident
                            incident_id = incidents[0].get("id")
                            if incident_id:
                                logger.info(f"📋 Found {len(incidents)} incidents from {tool_name}, using first ID (no RCA): {incident_id}")
                                return incident_id
                        incident_id = data.get("id")
                        if incident_id:
                            logger.info(f"📋 Found incident_id from {tool_name}: {incident_id}")
                            return incident_id
                
                # Case 3: Tickets (returns 'id' int)
                elif param_key == "ticket_id":
                    if isinstance(data, list) and data:
                        ticket_id = data[0].get("id")
                        if ticket_id:
                            logger.info(f"📋 Found ticket_id from {tool_name}: {ticket_id}")
                            return ticket_id
                    if isinstance(data, dict):
                        if "tickets" in data and data["tickets"]:
                            ticket_id = data["tickets"][0].get("id")
                            if ticket_id:
                                logger.info(f"📋 Found {len(data['tickets'])} tickets from {tool_name}, using first ID: {ticket_id}")
                                return ticket_id
                        ticket_id = data.get("id")
                        if ticket_id:
                            logger.info(f"📋 Found ticket_id from {tool_name}: {ticket_id}")
                            return ticket_id
                
                # Case 4: Changelogs (returns 'id' hash)
                elif param_key == "changelog_id":
                    if isinstance(data, list) and data:
                        changelog_id = data[0].get("id")
                        if changelog_id:
                            logger.info(f"📋 Found changelog_id from {tool_name}: {changelog_id}")
                            return changelog_id
                    if isinstance(data, dict):
                        if "changelogs" in data and data["changelogs"]:
                            changelog_id = data["changelogs"][0].get("id")
                            if changelog_id:
                                logger.info(f"📋 Found {len(data['changelogs'])} changelogs from {tool_name}, using first ID: {changelog_id}")
                                return changelog_id
                        changelog_id = data.get("id")
                        if changelog_id:
                            logger.info(f"📋 Found changelog_id from {tool_name}: {changelog_id}")
                            return changelog_id
            
            logger.warning(f"⚠️ Could not find suitable value for parameter '{param_key}' in mcp_results")
            return None
            
        except Exception as e:
            logger.error(f"❌ Error extracting value for '{param_key}': {str(e)}", exc_info=True)
            return None
    
    def _can_parallelize(self, tool_plan: List[Dict[str, Any]]) -> bool:
        """
        Check if tools can be executed in parallel.
        Returns False if ANY tool depends on data produced by another tool in the plan.
        """
        tool_names_in_plan = {t["name"] for t in tool_plan}
        
        logger.info(f"🔍 Checking parallelization for {len(tool_plan)} tools: {list(tool_names_in_plan)}")
        
        for tool_info in tool_plan:
            tool_name = tool_info.get("name")
            params = tool_info.get("parameters", {})
            
            # 1. Check Static Dependencies
            static_deps = self.tool_dependencies.get(tool_name, [])
            if any(dep in tool_names_in_plan for dep in static_deps):
                logger.info(f"🔗 Static Dependency: {tool_name} requires {static_deps}")
                return False
            
            # 2. Check Dynamic Domain Dependencies
            for param_key, producer_tools in self.domain_mappings.items():
                # If this tool NEEDS this parameter (e.g. 'incident_id')
                # AND the parameter is missing/empty/placeholder
                if self._is_param_missing(params, param_key):
                    # AND a tool that PRODUCES this ID is in the plan
                    if any(producer in tool_names_in_plan for producer in producer_tools):
                        logger.info(f"🔗 Dynamic Dependency: {tool_name} needs {param_key} from {producer_tools}")
                        return False
        
        logger.info(f"✅ Tools can be parallelized")
        return True
    
    def _is_param_missing(self, params: Dict[str, Any], key: str) -> bool:
        """Helper to detect missing or placeholder values"""
        if key not in params:
            return True  # Parameter is missing from dict
        val = params[key]
        # Check for empty, None, or placeholder values
        return not val or (isinstance(val, str) and val.lower() in ["", "tbd", "unknown", "placeholder", "null", "none"])
    
    def _topological_sort(self, tool_plan: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Sort tools in dependency order using topological sort (Kahn's algorithm).
        Ensures dependencies are executed before dependent tools.
        
        Args:
            tool_plan: List of tool dicts with 'name' and 'parameters'
            
        Returns:
            Sorted list in dependency order
        """
        from collections import defaultdict, deque
        
        # Build adjacency list and in-degree count
        graph = defaultdict(list)
        in_degree = defaultdict(int)
        tool_map = {tool["name"]: tool for tool in tool_plan}
        
        # Initialize all tools in the plan
        for tool in tool_plan:
            tool_name = tool["name"]
            if tool_name not in in_degree:
                in_degree[tool_name] = 0
        
        # Build graph from dependencies
        for tool_name in tool_map.keys():
            dependencies = self.tool_dependencies.get(tool_name, [])
            for dep in dependencies:
                if dep in tool_map:  # Only consider dependencies in current plan
                    graph[dep].append(tool_name)  # dep -> tool_name edge
                    in_degree[tool_name] += 1
        
        # Add dynamic dependencies for tools with empty parameters
        incident_retrieval_tools = ["get_incidents", "search_incidents"]
        for tool in tool_plan:
            tool_name = tool["name"]
            parameters = tool.get("parameters", {})
            
            # If tool has empty parameters and needs incident data
            if not parameters and "incident" in tool_name.lower():
                needs_incident_id = any(keyword in tool_name.lower() for keyword in 
                                       ["get_incident_by_id", "get_incident_curated", 
                                        "get_incident_changelogs", "get_incident_"])
                
                if needs_incident_id:
                    # Add dependency on incident retrieval tools
                    for retrieval_tool in incident_retrieval_tools:
                        if retrieval_tool in tool_map:
                            graph[retrieval_tool].append(tool_name)
                            in_degree[tool_name] += 1
                            logger.info(f"📊 Added dynamic dependency: {retrieval_tool} -> {tool_name}")
                            break  # Only add one dependency
        
        # Kahn's algorithm: Start with nodes that have no dependencies
        queue = deque([name for name in tool_map.keys() if in_degree[name] == 0])
        sorted_order = []
        
        while queue:
            current = queue.popleft()
            sorted_order.append(current)
            
            # Reduce in-degree for neighbors
            for neighbor in graph[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        # Check for circular dependencies
        if len(sorted_order) != len(tool_plan):
            logger.warning("⚠️ Circular dependency detected in tool plan! Using original order.")
            return tool_plan
        
        # Return tools in sorted order
        return [tool_map[name] for name in sorted_order]
    
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