"""
LLM Client for dynamic decision making throughout the LangGraph workflow
Refactored to use Pydantic models, enums, and centralized prompts
"""

import os
import logging
import json
from datetime import datetime
from typing import Dict, Any, List, Optional, Type, TypeVar
from dataclasses import dataclass
from openai import AsyncOpenAI
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, ValidationError

from .llm_enums import QueryType, RouteType, ExecutionType
from .llm_models import (
    QueryAnalysisResult,
    ToolPlanItem,
    MultiQueryPlan,
    SubQueryPlan,
    IncidentAnalysisResult,
    EnrichedResponseResult
)
from .llm_prompts import (
    QueryAnalysisPrompt,
    ToolPlanningPrompt,
    MultiQueryPlanningPrompt,
    RoutingPrompt,
    IncidentAnalysisPrompt,
    ResponseGenerationPrompt
)

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)


@dataclass
class LLMConfig:
    """Configuration for LLM client"""
    api_key: str
    model: str = "gpt-4-turbo-preview"
    temperature: float = 0.3
    
    @classmethod
    def from_env(cls) -> 'LLMConfig':
        """Create config from environment variables"""
        return cls(
            api_key=os.getenv("OPENAI_API_KEY", ""),
            model=os.getenv("LLM_MODEL", "gpt-4-turbo-preview"),
            temperature=float(os.getenv("LLM_TEMPERATURE", "0.3"))
        )


class LLMDecisionMaker:
    """
    Centralized LLM client for all decision making in the workflow.
    Uses Pydantic models for structured outputs and type safety.
    Returns dicts for backward compatibility with existing code.
    """
    
    def __init__(self, config: Optional[LLMConfig] = None):
        """
        Initialize LLM client with configuration
        
        Args:
            config: LLMConfig instance. If None, loads from environment.
        """
        self.config = config or LLMConfig.from_env()
        
        # Initialize clients
        if self.config.api_key:
            self.openai_client = AsyncOpenAI(api_key=self.config.api_key)
            self.langchain_client = ChatOpenAI(
                model=self.config.model,
                temperature=self.config.temperature,
                api_key=self.config.api_key
            )
        else:
            logger.warning("⚠️ No OpenAI API key found. LLM features will use fallback logic.")
            self.openai_client = None
            self.langchain_client = None
    
    async def _call_llm_structured(
        self,
        system_prompt: str,
        user_content: str,
        response_model: Type[T],
        temperature: Optional[float] = None
    ) -> T:
        """
        Generic method to call LLM with structured Pydantic output
        
        Args:
            system_prompt: System prompt for the LLM
            user_content: User message content
            response_model: Pydantic model class for response validation
            temperature: Override default temperature
            
        Returns:
            Validated Pydantic model instance
            
        Raises:
            Exception: If LLM call or validation fails
        """
        if not self.openai_client:
            raise Exception("OpenAI client not initialized")
        
        temp = temperature if temperature is not None else self.config.temperature
        
        response = await self.openai_client.chat.completions.create(
            model=self.config.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=temp,
            response_format={"type": "json_object"} if response_model != str else None
        )
        
        content = response.choices[0].message.content or "{}"
        
        # For debugging
        logger.debug(f"🤖 LLM Raw Response: {content[:200]}...")
        
        try:
            # Parse JSON and validate with Pydantic
            data = json.loads(content)
            validated = response_model.model_validate(data)
            return validated
        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(f"❌ Failed to parse/validate LLM response: {str(e)}")
            logger.error(f"Raw content: {content}")
            raise
    
    async def analyze_query_intent(
        self,
        user_query: str,
        available_tools: List[str],
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Use LLM to analyze user query and determine intent, entities, and strategy.
        Handles both single and multi-part queries.
        Includes ambiguity detection for production nudge-back loop.
        
        Args:
            user_query: The user's query string
            available_tools: List of available tool names
            conversation_history: Optional conversation history for context
            
        Returns:
            Dict with structured analysis (for backward compatibility)
        """
        if not self.openai_client:
            return self._fallback_query_analysis(user_query)
        
        # Build conversation context summary
        conversation_context = "None"
        if conversation_history:
            recent_messages = []
            for msg in conversation_history[-4:]:  # Last 4 messages
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if content:
                    recent_messages.append(f"{role}: {content[:100]}")  # Truncate long messages
            if recent_messages:
                conversation_context = "\n".join(recent_messages)
        
        system_prompt = QueryAnalysisPrompt.build(available_tools, conversation_context)
        
        try:
            analysis = await self._call_llm_structured(
                system_prompt=system_prompt,
                user_content=f"User Query: {user_query}",
                response_model=QueryAnalysisResult
            )
            
            logger.info(f"🧠 LLM Query Analysis: {analysis.query_type.value} (confidence: {analysis.confidence_score})")
            # Convert to dict for backward compatibility
            return analysis.model_dump()
            
        except Exception as e:
            logger.error(f"❌ LLM query analysis failed: {str(e)}")
            return self._fallback_query_analysis(user_query)
    
    async def plan_tool_sequence(
        self,
        query_analysis: Dict[str, Any],
        available_tools: List[str],
        context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Use LLM to dynamically plan tool execution sequence with parameters
        
        Args:
            query_analysis: Analyzed query intent (dict)
            available_tools: List of available tool names
            context: Optional previous context
            
        Returns:
            List of dicts with name and parameters (for backward compatibility)
        """
        if not self.openai_client:
            return self._fallback_tool_planning(query_analysis, available_tools)
        
        logger.info(f"🔧 Available tools for planning: {available_tools[:10]}...")  # Show first 10
        
        context_info = f"Previous context: {context}" if context else "No previous context"
        
        system_prompt = ToolPlanningPrompt.build(
            available_tools=available_tools,
            query_type=query_analysis.get("query_type", "general"),
            intent=query_analysis.get("intent", ""),
            entities=query_analysis.get("entities", []),
            context_info=context_info
        )
        
        try:
            # For this endpoint, we expect a JSON array, not an object
            # So we'll handle it differently
            response = await self.openai_client.chat.completions.create(
                model=self.config.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Plan tools for: {query_analysis.get('intent', '')}"}
                ],
                temperature=self.config.temperature
            )
            
            content = response.choices[0].message.content or "[]"
            logger.info(f"🔍 LLM Tool Planning Raw Response: {content[:200]}...")
            
            # Parse JSON array
            data = json.loads(content)
            
            # Handle case where LLM returns single dict instead of array
            if isinstance(data, dict):
                data = [data]
            elif not isinstance(data, list):
                data = []
            
            # Validate each item and filter to available tools
            valid_plan = []
            for item in data:
                if isinstance(item, dict) and "name" in item:
                    tool_name = item["name"]
                    if tool_name in available_tools:
                        try:
                            tool_item = ToolPlanItem.model_validate(item)
                            # Convert to dict for backward compatibility
                            valid_plan.append(tool_item.model_dump())
                        except ValidationError as e:
                            logger.warning(f"⚠️ Invalid tool plan item: {e}")
            
            logger.info(f"🛠️ LLM Tool Planning: {len(valid_plan)} tools planned with parameters")
            for tool in valid_plan:
                logger.info(f"   - {tool['name']}: {tool['parameters']}")
            
            return valid_plan
            
        except Exception as e:
            logger.error(f"❌ LLM tool planning failed: {str(e)}")
            return self._fallback_tool_planning(query_analysis, available_tools)
    
    async def plan_multi_query_execution(
        self,
        user_query: str,
        query_analysis: Dict[str, Any],
        available_tools: List[str]
    ) -> Dict[str, Any]:
        """
        Plan execution strategy for multi-part queries
        
        Args:
            user_query: Original user query
            query_analysis: Analyzed query dict with sub-queries
            available_tools: List of available tool names
            
        Returns:
            Dict with execution strategy (for backward compatibility)
        """
        if not self.openai_client:
            return self._fallback_multi_query_planning(query_analysis)
        
        if not query_analysis.get("is_multi_part", False):
            # Single query - use standard planning
            logger.info(f"📝 Planning tools for single query with analysis: {query_analysis.get('query_type')}")
            tools = await self.plan_tool_sequence(query_analysis, available_tools)
            logger.info(f"🔧 Tools planned for execution: {tools}")
            
            return {
                "execution_type": "single",
                "query_plan": {
                    "main_query": {
                        "query": user_query,
                        "tools": tools,
                        "priority": 1,
                        "depends_on": []
                    }
                }
            }
        
        system_prompt = MultiQueryPlanningPrompt.build(
            available_tools=available_tools,
            sub_queries=query_analysis.get("sub_queries", [])
        )
        
        try:
            plan = await self._call_llm_structured(
                system_prompt=system_prompt,
                user_content=f"Analyze this query: {user_query}",
                response_model=MultiQueryPlan
            )
            
            logger.info(f"🎯 Multi-Query Plan: {plan.execution_type.value} execution with {len(plan.query_plan)} sub-queries")
            # Convert to dict for backward compatibility
            return plan.model_dump()
            
        except Exception as e:
            logger.error(f"❌ Multi-query planning failed: {str(e)}")
            return self._fallback_multi_query_planning(query_analysis)
    
    async def make_routing_decision(self, state: Dict[str, Any]) -> str:
        """
        Use LLM to make intelligent routing decisions in the workflow
        
        Args:
            state: Current workflow state
            
        Returns:
            Route name as string (for backward compatibility)
        """
        if not self.openai_client:
            return self._fallback_routing_decision(state)
        
        system_prompt = RoutingPrompt.build()
        
        state_summary = {
            "query_type": state.get("query_type"),
            "executed_tools": len(state.get("executed_tools", [])),
            "error_count": state.get("error_count", 0),
            "has_incidents": bool(state.get("incident_analysis")),
            "mcp_results_count": len(state.get("mcp_results", []))
        }
        
        try:
            response = await self.openai_client.chat.completions.create(
                model=self.config.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Current state: {state_summary}"}
                ],
                temperature=0.1  # Lower temperature for routing decisions
            )
            
            route = (response.choices[0].message.content or "response_enrichment").strip()
            logger.info(f"🚦 LLM Routing Decision: {route}")
            
            return route
            
        except Exception as e:
            logger.error(f"❌ LLM routing decision failed: {str(e)}")
            return self._fallback_routing_decision(state)
    
    async def analyze_incident_data(
        self,
        mcp_results: List[Dict[str, Any]],
        user_query: str
    ) -> Dict[str, Any]:
        """
        Use LLM to perform dynamic incident analysis and correlation
        
        Args:
            mcp_results: Results from MCP tool executions
            user_query: Original user query
            
        Returns:
            Dict with structured analysis (for backward compatibility)
        """
        if not self.openai_client:
            return self._fallback_incident_analysis(mcp_results)
        
        system_prompt = IncidentAnalysisPrompt.build()
        
        # Summarize MCP results for LLM
        data_summary = []
        for result in mcp_results:
            if result.get("success"):
                tool_name = result["tool_name"]
                data = result.get("result", {})
                summary = f"{tool_name}: {str(data)[:500]}..."  # Truncate for token limits
                data_summary.append(summary)
        
        try:
            analysis = await self._call_llm_structured(
                system_prompt=system_prompt,
                user_content=f"User Query: {user_query}\n\nData to analyze:\n" + "\n".join(data_summary),
                response_model=IncidentAnalysisResult
            )
            
            logger.info(f"🔍 LLM Incident Analysis: {len(analysis.root_causes)} root causes found")
            # Convert to dict for backward compatibility
            return analysis.model_dump()
            
        except Exception as e:
            logger.error(f"❌ LLM incident analysis failed: {str(e)}")
            return self._fallback_incident_analysis(mcp_results)
    
    async def generate_enriched_response(
        self,
        state: Dict[str, Any],
        current_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Use LLM to generate contextual, actionable response
        
        Args:
            state: Current workflow state with tool results
            current_time: Current datetime for temporal awareness (defaults to now)
            
        Returns:
            Dict with final response and metadata (for backward compatibility)
        """
        if not self.openai_client:
            return self._fallback_response_generation(state)
        
        if current_time is None:
            current_time = datetime.now()
        
        current_date = current_time.strftime("%Y-%m-%d")
        
        system_prompt = ResponseGenerationPrompt.build(current_date)
        
        # Prepare context for LLM - include actual tool results data with explicit counts
        mcp_results = state.get("mcp_results", [])
        tool_data = []
        total_items_found = 0  # Count actual data to prevent hallucination
        
        for result in mcp_results:
            if result.get("success"):
                data = result.get("result", {})
                
                # Calculate explicit item count for this tool result
                count = self._count_items_in_result(data)
                total_items_found += count
                
                tool_data.append({
                    "tool": result.get("tool"),
                    "item_count": count,  # Explicitly show count to LLM
                    "data": data
                })
                
                # DEBUG: Log what data we got
                logger.info(f"🔍 Tool {result.get('tool')} returned: count={count}, data_preview={str(data)[:200]}")
        
        # Implement intelligent truncation to prevent context overflow
        SAMPLE_SIZE = 5  # Number of items to include as examples (reduced to prevent context overflow)
        truncated_tool_data = self._truncate_large_datasets(tool_data, SAMPLE_SIZE)
        
        context = {
            "original_query": state.get("user_query"),
            "query_analysis": {
                "type": state.get("query_type"),
                "intent": state.get("intent")
            },
            "tool_results": truncated_tool_data,  # TRUNCATED DATA with full counts
            "execution_summary": {
                "tools_executed": len(state.get("executed_tools", [])),
                "success_count": len([r for r in mcp_results if r.get("success")])
            },
            "metrics": {
                "total_data_points_found": total_items_found,  # Force LLM to see count
                "tools_with_data": len([t for t in tool_data if t.get("item_count", 0) > 0])
            },
            "key_findings": state.get("incident_analysis", {}),
            "enrichment_data": state.get("enrichment_data", {})
        }
        
        # Log metrics to detect hallucination attempts
        logger.info(f"📊 Response Generation Metrics: total_data_points_found={total_items_found}, tools_with_data={len([t for t in tool_data if t.get('item_count', 0) > 0])}")
        
        try:
            enriched_response = await self._call_llm_structured(
                system_prompt=system_prompt,
                user_content=f"Generate response for: {json.dumps(context, default=str)}",
                response_model=EnrichedResponseResult
            )
            
            logger.info(f"✨ LLM Response Generation: Generated {len(enriched_response.forward_links)} forward links")
            logger.info(f"✨ Response text length: {len(enriched_response.final_response)}")
            
            # Convert Pydantic model to dict for backward compatibility
            return enriched_response.model_dump()
            
        except Exception as e:
            logger.error(f"❌ LLM response generation failed: {str(e)}")
            return self._fallback_response_generation(state)
    
    def _count_items_in_result(self, data: Any) -> int:
        """Count the number of meaningful data items in a tool result based on API structure"""
        count = 0
        if isinstance(data, list):
            return len(data)
        
        if isinstance(data, dict):
            # Handle Manifest API specific wrappers
            if "incidents" in data and isinstance(data["incidents"], list):
                return len(data["incidents"])
            if "tickets" in data and isinstance(data["tickets"], list):
                return len(data["tickets"])
            if "resources" in data and isinstance(data["resources"], list):
                return len(data["resources"])
            if "changelogs" in data and isinstance(data["changelogs"], list):
                return len(data["changelogs"])
            if "notifications" in data and isinstance(data["notifications"], list):
                return len(data["notifications"])
            
            # Handle generic wrappers
            if "data" in data:
                nested = data["data"]
                if isinstance(nested, list):
                    return len(nested)
                if isinstance(nested, dict) and "result" in nested:
                    result = nested["result"]
                    if isinstance(result, list):
                        return len(result)
                    # Recursively check result dict for API-specific fields
                    if isinstance(result, dict):
                        for key in ["incidents", "tickets", "resources", "changelogs", "notifications", "logs", "nodes"]:
                            if key in result and isinstance(result[key], list):
                                return len(result[key])
            
            # Handle Log counts
            if "total_count" in data:
                return data["total_count"]
            
            # Default for single object returns (get_by_id)
            if "id" in data or "resourceId" in data:
                return 1
        
        return count
    
    def _truncate_large_datasets(self, tool_data: List[Dict], sample_size: int) -> List[Dict]:
        """Truncate large datasets to prevent context overflow"""
        truncated_tool_data = []
        
        for tool_result in tool_data:
            data = tool_result.get("data", {})
            count = tool_result.get("item_count", 0)
            
            if count > sample_size:
                # Extract the actual list from nested structure
                nested_data = data.get("data", {}).get("result", data) if isinstance(data, dict) else data
                
                # Find the list to truncate
                actual_list = None
                list_key = None
                if isinstance(nested_data, dict):
                    for key in ["tickets", "incidents", "resources", "changelogs", "notifications", "logs", "results", "nodes"]:
                        if key in nested_data and isinstance(nested_data[key], list):
                            actual_list = nested_data[key]
                            list_key = key
                            break
                elif isinstance(nested_data, list):
                    actual_list = nested_data
                    list_key = "items"
                
                if actual_list and len(actual_list) > sample_size:
                    # Create truncated data with sample + summary
                    truncated_list = actual_list[:sample_size]
                    
                    # Rebuild nested structure with truncated list
                    if isinstance(data, dict) and "data" in data:
                        truncated_nested = nested_data.copy()
                        truncated_nested[list_key] = truncated_list
                        truncated_data = {
                            "data": {
                                "result": truncated_nested
                            }
                        }
                    else:
                        truncated_data = truncated_list
                    
                    truncated_tool_data.append({
                        "tool": tool_result.get("tool"),
                        "item_count": count,  # Full count preserved
                        "sample_size": sample_size,
                        "data": truncated_data,
                        "truncation_note": f"Showing {sample_size} of {count} total items"
                    })
                    logger.info(f"✂️ Truncated {tool_result.get('tool')} data: {count} items → {sample_size} sample")
                else:
                    truncated_tool_data.append(tool_result)
            else:
                truncated_tool_data.append(tool_result)
        
        return truncated_tool_data
    
    # Fallback methods for when LLM is unavailable
    
    def _fallback_query_analysis(self, user_query: str) -> Dict[str, Any]:
        """Fallback query analysis using simple heuristics"""
        query_lower = user_query.lower()
        
        if any(word in query_lower for word in ["error", "incident", "problem", "failure"]):
            return {
                "query_type": "incident_analysis",
                "intent": "investigate_issue",
                "entities": [],
                "confidence_score": 0.7,
                "specificity_level": "medium",
                "investigation_strategy": "Broad incident investigation",
                "is_multi_part": False,
                "requires_memory": False,
                "requires_tools": True,
                "is_ambiguous": False,
                "clarification_question": None,
                "missing_info": []
            }
        else:
            return {
                "query_type": "exploration",
                "intent": "explore_data",
                "entities": [],
                "confidence_score": 0.6,
                "is_multi_part": False,
                "sub_queries": [user_query],
                "specificity_level": "low",
                "investigation_strategy": "General data exploration",
                "requires_memory": False,
                "requires_tools": True,
                "is_ambiguous": False,
                "clarification_question": None,
                "missing_info": []
            }
    
    def _fallback_tool_planning(
        self,
        query_analysis: Dict[str, Any],
        available_tools: List[str]
    ) -> List[Dict[str, Any]]:
        """Fallback tool planning using simple rules"""
        query_type = query_analysis.get("query_type", "general")
        
        if query_type == "incident_analysis":
            tools = [tool for tool in ["search_logs", "get_incidents", "search_changelogs"] if tool in available_tools]
        else:
            tools = [tool for tool in ["get_node_count", "get_node_labels", "get_schema"] if tool in available_tools]
        
        return [{"name": tool, "parameters": {}} for tool in tools]
    
    def _fallback_routing_decision(self, state: Dict[str, Any]) -> str:
        """Fallback routing decision using simple rules"""
        error_count = state.get("error_count", 0)
        if error_count >= 3:
            return "error_recovery"
        
        query_type = state.get("query_type", "")
        if query_type == "incident_analysis":
            return "incident_analysis"
        
        return "response_enrichment"
    
    def _fallback_incident_analysis(self, mcp_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Fallback incident analysis"""
        return {
            "root_causes": [{"cause": "Unable to analyze without LLM", "evidence": [], "confidence": 0.3}],
            "correlations": [],
            "timeline": [],
            "affected_resources": [],
            "confidence_score": 0.3,
            "recommendations": ["Enable LLM integration for detailed analysis"]
        }
    
    def _fallback_multi_query_planning(self, query_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback multi-query planning using simple rules"""
        sub_queries = query_analysis.get("sub_queries", [query_analysis.get("intent", "unknown")])
        
        query_plan = {}
        for i, sub_query in enumerate(sub_queries, 1):
            query_plan[f"query_{i}"] = {
                "query": sub_query,
                "tools": [
                    {"name": "get_database_stats", "parameters": {}},
                    {"name": "get_schema", "parameters": {}}
                ],
                "priority": i,
                "depends_on": []
            }
        
        return {
            "execution_type": "sequential",
            "query_plan": query_plan,
            "estimated_execution_time": "30",
            "parallelization_opportunities": []
        }
    
    def _fallback_response_generation(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback response generation"""
        return {
            "final_response": "Analysis completed. Enable LLM integration for enhanced responses.",
            "forward_links": [],
            "annotations": ["LLM unavailable - using basic response"],
            "confidence": 0.5
        }


# Global instance (backward compatibility)
llm_client = LLMDecisionMaker()