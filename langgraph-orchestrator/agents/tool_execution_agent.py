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
        
        # 2. Parameter Extraction Rules (Universal Parameter Resolution)
        # Maps parameter names to extraction strategies
        self.parameter_extraction_rules = {
            "incident_id": {
                "field_names": ["id", "incident_id", "incidentId"],
                "wrapper_keys": ["incident", "incidents"],
                "type_conversion": str,
                "producer_tools": ["get_incidents", "search_incidents", "get_incident_by_id"],
                "priority_filter": lambda items: self._prioritize_by_rca(items) if items else None
            },
            "resource_id": {
                "field_names": ["id", "resourceId", "resource_id"],
                "wrapper_keys": ["resource", "resources"],
                "type_conversion": str,
                "producer_tools": ["get_resources", "search_resources", "get_notifications"],
                "priority_filter": None
            },
            "ticket_id": {
                "field_names": ["id", "ticket_id", "ticketId"],
                "wrapper_keys": ["ticket", "tickets"],
                "type_conversion": str,
                "producer_tools": ["get_tickets", "search_tickets", "get_resource_tickets"],
                "priority_filter": None
            },
            "changelog_id": {
                "field_names": ["id", "changelog_id", "changelogId"],
                "wrapper_keys": ["changelog", "changelogs"],
                "type_conversion": str,
                "producer_tools": ["get_changelogs", "search_changelogs"],
                "priority_filter": None
            },
            "notification_id": {
                "field_names": ["id", "notification_id", "notificationId"],
                "wrapper_keys": ["notification", "notifications"],
                "type_conversion": str,
                "producer_tools": ["get_notifications"],
                "priority_filter": None
            },
            "user_id": {
                "field_names": ["id", "user_id", "userId"],
                "wrapper_keys": ["user", "users"],
                "type_conversion": str,
                "producer_tools": ["get_users", "search_users"],
                "priority_filter": None
            },
            "organization_id": {
                "field_names": ["id", "organization_id", "organizationId", "orgId"],
                "wrapper_keys": ["organization", "organizations"],
                "type_conversion": str,
                "producer_tools": ["get_organizations"],
                "priority_filter": None
            }
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
    
    def _prioritize_by_rca(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Prioritize incidents that have RCA (Root Cause Analysis) data"""
        if not items:
            return items
        
        items_with_rca = [
            item for item in items 
            if item is not None and isinstance(item, dict) and 
            (item.get("metadata") or {}).get("summary", {}).get("rca")
        ]
        
        if items_with_rca:
            logger.info(f"🎯 Prioritized {len(items_with_rca)}/{len(items)} items with RCA")
            return items_with_rca + [item for item in items if item not in items_with_rca]
        
        return items
    
    def _resolve_parameter_placeholders(self, parameters: Dict[str, Any], state: ChatState) -> Optional[Dict[str, Any]]:
        """
        Universal parameter resolution system - works for any tool and any parameter type.
        
        Resolution Strategy:
        1. If parameters are empty, try to infer all required parameters from context
        2. For each parameter with placeholder/empty value, resolve from previous results
        3. Use extraction rules to find values in nested structures
        4. Apply type conversions (e.g., int to str for MCP compatibility)
        5. Handle batch operations (multiple IDs)
        
        Returns:
            Dict with resolved parameters, or None if required parameters couldn't be resolved
        """
        tool_name = state.get("current_tool_name", "")
        logger.info(f"🔧 Resolving parameters for {tool_name}: {parameters}")
        
        # Case 1: Empty parameters - check if tool requires parameters
        if not parameters:
            # Listing tools that work without parameters
            no_param_tools = [
                'get_incidents', 'get_resources', 'get_tickets', 'get_changelogs',
                'search_incidents', 'search_resources', 'search_tickets', 'search_changelogs',
                'get_database_stats', 'get_node_count', 'get_schema', 'get_node_labels',
                'get_relationship_types', 'query_logs'
            ]
            
            if tool_name in no_param_tools:
                logger.info(f"✅ {tool_name} is a listing tool, no parameters required")
                return {}  # Return empty dict, not None
            
            logger.info(f"📋 Empty parameters for {tool_name}, attempting intelligent inference")
            inferred_params = self._infer_parameters_from_context(tool_name, state)
            
            if inferred_params:
                logger.info(f"✅ Successfully inferred parameters: {inferred_params}")
                return inferred_params
            else:
                logger.warning(f"⚠️ Could not infer parameters for {tool_name} from context")
                # For tools that might work without parameters, return empty dict
                logger.info(f"ℹ️ Attempting to execute {tool_name} without parameters")
                return {}
        
        # Case 2: Parameters exist but may contain placeholders
        resolved_params = {}
        failed_to_resolve = []
        
        for key, value in parameters.items():
            # Check if value needs resolution
            needs_resolution = self._needs_resolution(value)
            
            if needs_resolution:
                logger.info(f"🔍 Resolving {key}='{value}'")
                resolved_value = self._extract_value_from_results(key, state)
                
                if resolved_value is not None:
                    # Apply type conversion if defined
                    if key in self.parameter_extraction_rules:
                        type_converter = self.parameter_extraction_rules[key].get("type_conversion")
                        if type_converter:
                            if isinstance(resolved_value, list):
                                resolved_value = [type_converter(v) for v in resolved_value]
                            else:
                                resolved_value = type_converter(resolved_value)
                    
                    logger.info(f"✅ Resolved {key}='{value}' -> {resolved_value}")
                    resolved_params[key] = resolved_value
                else:
                    logger.warning(f"⚠️ Could not resolve {key}='{value}'")
                    failed_to_resolve.append(key)
            else:
                # Value is already valid, keep as-is
                resolved_params[key] = value
        
        # If we couldn't resolve critical parameters, return None to skip execution
        if failed_to_resolve:
            logger.error(f"❌ Failed to resolve required parameters: {failed_to_resolve}")
            return None
            
        return resolved_params
    
    def _needs_resolution(self, value: Any) -> bool:
        """Check if a parameter value needs resolution"""
        # Non-string values don't need resolution
        if not isinstance(value, str):
            return False
        
        # Empty string needs resolution
        if not value or value.strip() == '':
            return True
        
        # If it's a valid number (int or float), it doesn't need resolution
        try:
            float(value)
            return False  # Valid numeric value
        except ValueError:
            pass
        
        # Placeholder patterns that indicate resolution is needed
        placeholder_patterns = [
            '_from_step_',
            'step_',
            'id_from_',
            'undefined',
            'null',
            'None',
            'TBD',
            'placeholder'
        ]
        
        # Check for placeholder patterns
        value_lower = value.lower()
        if any(pattern.lower() in value_lower for pattern in placeholder_patterns):
            return True
        
        # If value starts with 'id_' but isn't a valid format, needs resolution
        if value.startswith('id_') and not value[3:].isalnum():
            return True
        
        # Otherwise, assume it's a valid literal value
        return False
    
    def _infer_parameters_from_context(self, tool_name: str, state: ChatState) -> Optional[Dict[str, Any]]:
        """
        Intelligently infer required parameters for a tool based on:
        1. Tool name patterns (e.g., "incident" in name -> needs incident_id)
        2. Previous tool results
        3. Parameter extraction rules
        
        Returns:
            Dict of inferred parameters, or None if inference fails
        """
        inferred = {}
        
        # Analyze tool name to determine what parameters it likely needs
        required_params = self._guess_required_parameters(tool_name)
        
        logger.info(f"🎯 Tool {tool_name} likely needs: {required_params}")
        
        # Try to extract each required parameter from context
        for param_name in required_params:
            value = self._extract_value_from_results(param_name, state)
            
            if value is not None:
                # Handle batch operations (multiple IDs)
                if isinstance(value, list) and len(value) > 0:
                    # For batch operations, store all IDs and use first for this call
                    state[f"batch_{param_name}s"] = value
                    inferred[param_name] = value[0] if len(value) == 1 else value
                    logger.info(f"✅ Inferred {param_name} (batch): {value}")
                else:
                    inferred[param_name] = value
                    logger.info(f"✅ Inferred {param_name}: {value}")
            else:
                logger.warning(f"⚠️ Could not infer {param_name} from context")
        
        # Return inferred params only if we found at least one
        return inferred if inferred else None
    
    def _guess_required_parameters(self, tool_name: str) -> List[str]:
        """Guess what parameters a tool needs based on its name"""
        tool_lower = tool_name.lower()
        required = []
        
        # Skip listing/search tools - they don't require IDs
        if tool_lower.startswith('get_incidents') or tool_lower.startswith('search_incidents'):
            return []  # These list all incidents, no ID required
        if tool_lower.startswith('get_resources') or tool_lower.startswith('search_resources'):
            return []  # These list all resources, no ID required
        if tool_lower.startswith('get_tickets') or tool_lower.startswith('search_tickets'):
            return []  # These list all tickets, no ID required
        
        # Pattern matching for tools that require specific IDs
        # Only match if the tool operates on a SINGLE entity
        specific_patterns = {
            "incident_by_id": "incident_id",
            "incident_changelogs": "incident_id",
            "incident_resources": "incident_id",
            "incident_logs": "incident_id",
            "resource_by_id": "resource_id",
            "resource_incidents": "resource_id",
            "ticket_by_id": "ticket_id",
            "changelog_by_id": "changelog_id",
            "notification_by_id": "notification_id",
            "user_by_id": "user_id"
        }
        
        for pattern, param_name in specific_patterns.items():
            if pattern in tool_lower:
                required.append(param_name)
                break  # Only match first pattern
        
        return required
    
    def _extract_value_from_results(self, param_key: str, state: ChatState) -> Optional[Any]:
        """
        Universal value extraction from previous tool results.
        
        Uses parameter extraction rules to:
        1. Find the right tool results (based on producer_tools)
        2. Navigate nested data structures (using wrapper_keys and field_names)
        3. Apply priority filters (e.g., prioritize incidents with RCA)
        4. Handle both single values and lists
        5. Apply type conversions
        
        Args:
            param_key: Parameter name to extract (e.g., "incident_id", "resource_id")
            state: Current state with mcp_results
            
        Returns:
            Extracted value (single value or list), or None if not found
        """
        mcp_results = state.get("mcp_results", [])
        if not mcp_results:
            logger.warning("⚠️ No mcp_results in state to extract values from")
            return None
        
        logger.info(f"🔍 Extracting {param_key} from {len(mcp_results)} mcp_results")
        
        # Get extraction rules for this parameter
        extraction_rule = self.parameter_extraction_rules.get(param_key)
        if not extraction_rule:
            logger.warning(f"⚠️ No extraction rule defined for {param_key}, using fallback")
            return self._fallback_extraction(param_key, mcp_results, state)
        
        field_names = extraction_rule.get("field_names", ["id"])
        wrapper_keys = extraction_rule.get("wrapper_keys", [])
        producer_tools = extraction_rule.get("producer_tools", [])
        priority_filter = extraction_rule.get("priority_filter")
        type_conversion = extraction_rule.get("type_conversion")
        
        # Look through results in reverse order (newest first)
        for idx, result_entry in enumerate(reversed(mcp_results)):
            if not result_entry.get("success"):
                continue
            
            tool_name = result_entry.get("tool_name")
            
            # Skip if this tool doesn't produce the parameter we need
            if producer_tools and tool_name not in producer_tools:
                continue
            
            logger.info(f"🔍 Checking result {idx}: tool={tool_name}")
            
            # Extract and unwrap data
            data = self._unwrap_response_data(result_entry.get("result", {}))
            
            if data is None:
                logger.warning(f"⚠️ Data is None after unwrapping for {tool_name}")
                continue
            
            # Try to extract value from this result
            extracted_value = self._extract_from_data_structure(
                data=data,
                field_names=field_names,
                wrapper_keys=wrapper_keys,
                priority_filter=priority_filter,
                state=state,
                param_key=param_key
            )
            
            if extracted_value is not None:
                # Apply type conversion if specified
                if type_conversion:
                    if isinstance(extracted_value, list):
                        extracted_value = [type_conversion(v) for v in extracted_value if v is not None]
                    else:
                        extracted_value = type_conversion(extracted_value)
                
                logger.info(f"✅ Extracted {param_key} from {tool_name}: {extracted_value}")
                return extracted_value
        
        logger.warning(f"⚠️ Could not extract {param_key} from any result")
        return None
    
    def _unwrap_response_data(self, response: Any) -> Any:
        """Unwrap nested response structures (data.data.result, etc.)"""
        data = response
        
        # Unwrap common nesting patterns
        unwrap_keys = ["data", "result", "response"]
        for _ in range(3):  # Max 3 levels of unwrapping
            if isinstance(data, dict):
                for key in unwrap_keys:
                    if key in data and data[key] is not None:
                        data = data[key]
                        logger.debug(f"🔍 Unwrapped '{key}' layer, new type: {type(data)}")
                        break
                else:
                    # No more unwrapping possible
                    break
            else:
                break
        
        return data
    
    def _extract_from_data_structure(
        self,
        data: Any,
        field_names: List[str],
        wrapper_keys: List[str],
        priority_filter: Optional[callable],
        state: ChatState,
        param_key: str
    ) -> Optional[Any]:
        """Extract value from various data structure patterns"""
        
        # Case 1: Data is a list of items
        if isinstance(data, list) and data:
            items = [item for item in data if item is not None and isinstance(item, dict)]
            if not items:
                return None
            
            # Apply priority filter if defined
            if priority_filter:
                items = priority_filter(items)
            
            # Check if we need multiple IDs (for batch operations)
            limit = self._get_limit_from_tool_plan(state)
            
            if limit > 1:
                # Extract multiple IDs for batch processing
                ids = []
                for item in items[:limit]:
                    for field_name in field_names:
                        value = item.get(field_name)
                        if value is not None:
                            ids.append(value)
                            break
                if ids:
                    logger.info(f"📋 Extracted {len(ids)} IDs for batch operation")
                    return ids
            
            # Extract single ID from first item
            for item in items:
                for field_name in field_names:
                    value = item.get(field_name)
                    if value is not None:
                        return value
        
        # Case 2: Data is a dict with wrapper keys
        if isinstance(data, dict):
            # Try wrapper keys first (e.g., "incidents", "resources")
            for wrapper_key in wrapper_keys:
                if wrapper_key in data and data[wrapper_key]:
                    wrapped_data = data[wrapper_key]
                    
                    # Recursively extract from wrapped data
                    if isinstance(wrapped_data, list):
                        return self._extract_from_data_structure(
                            wrapped_data, field_names, [], priority_filter, state, param_key
                        )
                    elif isinstance(wrapped_data, dict):
                        # Try to extract directly from wrapped dict
                        for field_name in field_names:
                            value = wrapped_data.get(field_name)
                            if value is not None:
                                return value
            
            # Try direct field extraction
            for field_name in field_names:
                value = data.get(field_name)
                if value is not None:
                    return value
        
        return None
    
    def _get_limit_from_tool_plan(self, state: ChatState) -> int:
        """Extract limit parameter from tool plan if present"""
        tool_plan = state.get("tool_plan", [])
        tool_name = state.get("current_tool_name", "")
        
        for tool_info in tool_plan:
            if tool_info.get("name") == tool_name:
                params = tool_info.get("parameters", {})
                limit = params.get("limit", 1)
                logger.debug(f"🔍 Found limit={limit} in tool plan")
                return limit
        
        return 1
    
    def _fallback_extraction(self, param_key: str, mcp_results: List[Dict], state: ChatState) -> Optional[Any]:
        """Fallback extraction when no rule is defined - try common patterns"""
        logger.info(f"🔄 Using fallback extraction for {param_key}")
        
        # Try common field names
        common_fields = ["id", param_key, param_key.replace("_", "")]
        
        for result_entry in reversed(mcp_results):
            if not result_entry.get("success"):
                continue
            
            data = self._unwrap_response_data(result_entry.get("result", {}))
            
            if isinstance(data, dict):
                for field in common_fields:
                    if field in data:
                        value = data[field]
                        if value is not None:
                            logger.info(f"✅ Fallback extracted {param_key}: {value}")
                            return value
            
            elif isinstance(data, list) and data:
                for item in data:
                    if isinstance(item, dict):
                        for field in common_fields:
                            if field in item:
                                value = item[field]
                                if value is not None:
                                    logger.info(f"✅ Fallback extracted {param_key}: {value}")
                                    return value
        
        logger.warning(f"⚠️ Could not find suitable value for parameter '{param_key}' in mcp_results")
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
            for param_key, rule in self.parameter_extraction_rules.items():
                # If this tool NEEDS this parameter (e.g. 'incident_id')
                # AND the parameter is missing/empty/placeholder
                if self._is_param_missing(params, param_key):
                    # AND a tool that PRODUCES this ID is in the plan
                    producer_tools = rule.get("producer_tools", [])
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