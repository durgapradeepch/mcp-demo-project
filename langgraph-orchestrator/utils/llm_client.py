"""
LLM Client for dynamic decision making throughout the LangGraph workflow
"""

import os
import logging
from typing import Dict, Any, List, Optional
from openai import AsyncOpenAI
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

logger = logging.getLogger(__name__)

class LLMDecisionMaker:
    """
    Centralized LLM client for all decision making in the workflow
    """
    
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        self.model = os.getenv("LLM_MODEL", "gpt-4-turbo-preview")
        self.temperature = float(os.getenv("LLM_TEMPERATURE", "0.3"))
        
        # Initialize clients
        if self.api_key:
            self.openai_client = AsyncOpenAI(api_key=self.api_key)
            self.langchain_client = ChatOpenAI(
                model=self.model,
                temperature=self.temperature,
                api_key=self.api_key
            )
        else:
            logger.warning("⚠️ No OpenAI API key found. LLM features will use fallback logic.")
            self.openai_client = None
            self.langchain_client = None
    
    async def analyze_query_intent(self, user_query: str, available_tools: List[str]) -> Dict[str, Any]:
        """
        Use LLM to analyze user query and determine intent, entities, and strategy.
        Handles both single and multi-part queries.
        """
        if not self.openai_client:
            return self._fallback_query_analysis(user_query)
        
        system_prompt = f"""
        You are a query analysis expert for a database investigation system.
        
        Available MCP Tools: {', '.join(available_tools)}
        
        Analyze the user query and provide:
        1. is_multi_part: true if query contains multiple distinct questions/tasks
        2. sub_queries: If multi-part, break into separate logical queries
        3. query_type: "incident_analysis", "exploration", "root_cause", "data_retrieval", or "general"
        4. intent: Brief description of what the user wants
        5. entities: List of specific entities mentioned (IDs, names, dates, etc.)
        6. confidence_score: 0.0-1.0 confidence in your analysis
        7. specificity_level: "high", "medium", or "low" based on how specific the query is
        8. investigation_strategy: Explain how to approach this query
        9. execution_plan: If multi-part, specify "sequential" or "parallel" execution
        10. priority_order: If multi-part, order sub-queries by priority (1=highest)
        
        Respond in JSON format only.
        """
        
        try:
            response = await self.openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"User Query: {user_query}"}
                ],
                temperature=self.temperature
            )
            
            import json
            analysis = json.loads(response.choices[0].message.content)
            logger.info(f"🧠 LLM Query Analysis: {analysis['query_type']} (confidence: {analysis['confidence_score']})")
            
            return analysis
            
        except Exception as e:
            logger.error(f"❌ LLM query analysis failed: {str(e)}")
            return self._fallback_query_analysis(user_query)
    
    async def plan_tool_sequence(self, query_analysis: Dict[str, Any], available_tools: List[str], 
                               context: Dict[str, Any] = None) -> List[str]:
        """
        Use LLM to dynamically plan tool execution sequence based on query and available tools
        """
        if not self.openai_client:
            return self._fallback_tool_planning(query_analysis, available_tools)
        
        context_info = f"Previous context: {context}" if context else "No previous context"
        
        system_prompt = f"""
        You are a tool orchestration expert. Plan the optimal sequence of tools to answer the user's query.
        
        Available Tools: {', '.join(available_tools)}
        
        Query Analysis: {query_analysis}
        {context_info}
        
        Consider:
        - Dependencies between tools (some tools need results from others)
        - Efficiency (parallel vs sequential execution)
        - Query specificity (broad investigation vs targeted lookup)
        
        Respond with a JSON array of tool names in execution order.
        Example: ["search_logs", "get_incidents", "get_resource_by_id"]
        """
        
        try:
            response = await self.openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Plan tools for: {query_analysis.get('intent', 'Unknown query')}"}
                ],
                temperature=self.temperature
            )
            
            import json
            tool_sequence = json.loads(response.choices[0].message.content)
            
            # Validate tools exist
            valid_tools = [tool for tool in tool_sequence if tool in available_tools]
            
            logger.info(f"🛠️ LLM Tool Planning: {len(valid_tools)} tools planned")
            return valid_tools
            
        except Exception as e:
            logger.error(f"❌ LLM tool planning failed: {str(e)}")
            return self._fallback_tool_planning(query_analysis, available_tools)
    
    async def plan_multi_query_execution(self, user_query: str, query_analysis: Dict[str, Any], 
                                       available_tools: List[str]) -> Dict[str, Any]:
        """
        Plan execution strategy for multi-part queries
        """
        if not self.openai_client:
            return self._fallback_multi_query_planning(query_analysis)
        
        if not query_analysis.get("is_multi_part", False):
            # Single query - use standard planning
            tools = await self.plan_tool_sequence(user_query, query_analysis, available_tools)
            return {
                "execution_type": "single",
                "query_plan": {
                    "main_query": {
                        "query": user_query,
                        "tools": tools,
                        "priority": 1
                    }
                }
            }
        
        # Build system prompt without using a single f-string that contains
        # literal JSON braces (which would be interpreted by the f-string parser).
        header = (
            f"You are an execution planner for multi-part database queries.\n\n"
            f"Available Tools: {', '.join(available_tools)}\n\n"
            "The user has a multi-part query with these sub-queries:\n"
            f"{query_analysis.get('sub_queries', [])}\n\n"
            "Plan the execution strategy:\n"
            "1. For each sub-query, determine required tools\n"
            "2. Identify dependencies between sub-queries\n"
            "3. Decide execution order and parallelization opportunities\n"
            "4. Assign priority levels (1=highest, 5=lowest)\n\n"
            "Respond with JSON:\n"
        )

        json_example = (
            '{\n'
            '    "execution_type": "sequential" or "parallel" or "mixed",\n'
            '    "query_plan": {\n'
            '        "query_1": {\n'
            '            "query": "sub-query text",\n'
            '            "tools": ["tool1", "tool2"],\n'
            '            "priority": 1,\n'
            '            "depends_on": []\n'
            '        },\n'
            '        "query_2": {\n'
            '            "query": "sub-query text", \n'
            '            "tools": ["tool3"],\n'
            '            "priority": 2,\n'
            '            "depends_on": ["query_1"]\n'
            '        }\n'
            '    },\n'
            '    "estimated_execution_time": "seconds",\n'
            '    "parallelization_opportunities": ["query_1", "query_3"]\n'
            '}\n'
        )

        system_prompt = header + json_example
        
        try:
            response = await self.openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Multi-part query: {user_query}"}
                ],
                temperature=self.temperature
            )
            
            import json
            execution_plan = json.loads(response.choices[0].message.content)
            
            logger.info(f"🎯 Multi-Query Plan: {execution_plan['execution_type']} execution with {len(execution_plan['query_plan'])} sub-queries")
            return execution_plan
            
        except Exception as e:
            logger.error(f"❌ Multi-query planning failed: {str(e)}")
            return self._fallback_multi_query_planning(query_analysis)
    
    async def make_routing_decision(self, state: Dict[str, Any]) -> str:
        """
        Use LLM to make intelligent routing decisions in the workflow
        """
        if not self.openai_client:
            return self._fallback_routing_decision(state)
        
        system_prompt = """
        You are a workflow router. Based on the current state, decide the next step.
        
        Available routes:
        - "incident_analysis": Deep investigation of incidents and root causes
        - "response_enrichment": Generate final response with recommendations  
        - "error_recovery": Handle errors and provide fallback response
        - "continue_execution": Continue with more tool executions
        
        Respond with only the route name.
        """
        
        state_summary = {
            "query_type": state.get("query_type"),
            "executed_tools": len(state.get("executed_tools", [])),
            "error_count": state.get("error_count", 0),
            "has_incidents": bool(state.get("incident_analysis")),
            "mcp_results_count": len(state.get("mcp_results", []))
        }
        
        try:
            response = await self.openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Current state: {state_summary}"}
                ],
                temperature=0.1  # Lower temperature for routing decisions
            )
            
            route = response.choices[0].message.content.strip()
            logger.info(f"🚦 LLM Routing Decision: {route}")
            
            return route
            
        except Exception as e:
            logger.error(f"❌ LLM routing decision failed: {str(e)}")
            return self._fallback_routing_decision(state)
    
    async def analyze_incident_data(self, mcp_results: List[Dict[str, Any]], 
                                  user_query: str) -> Dict[str, Any]:
        """
        Use LLM to perform dynamic incident analysis and correlation
        """
        if not self.openai_client:
            return self._fallback_incident_analysis(mcp_results)
        
        system_prompt = """
        You are an expert incident analyst. Analyze the provided data to identify:
        1. root_causes: List of potential root causes with evidence
        2. correlations: Connections between different data points
        3. timeline: Chronological sequence of events
        4. affected_resources: Resources impacted by incidents
        5. confidence_score: 0.0-1.0 confidence in your analysis
        6. recommendations: Actionable next steps
        
        Focus on finding patterns, correlations, and causation chains.
        Respond in JSON format.
        """
        
        # Summarize MCP results for LLM
        data_summary = []
        for result in mcp_results:
            if result.get("success"):
                tool_name = result["tool_name"]
                data = result.get("result", {})
                summary = f"{tool_name}: {str(data)[:500]}..."  # Truncate for token limits
                data_summary.append(summary)
        
        try:
            response = await self.openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"User Query: {user_query}\n\nData to analyze:\n" + "\n".join(data_summary)}
                ],
                temperature=self.temperature
            )
            
            import json
            analysis = json.loads(response.choices[0].message.content)
            logger.info(f"🔍 LLM Incident Analysis: {len(analysis.get('root_causes', []))} root causes found")
            
            return analysis
            
        except Exception as e:
            logger.error(f"❌ LLM incident analysis failed: {str(e)}")
            return self._fallback_incident_analysis(mcp_results)
    
    async def generate_enriched_response(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Use LLM to generate contextual, actionable response
        """
        if not self.openai_client:
            return self._fallback_response_generation(state)
        
        system_prompt = """
        You are a helpful assistant generating responses for database investigations.
        
        Create a comprehensive response that includes:
        1. final_response: Clear, actionable answer to the user's question
        2. forward_links: List of specific next actions the user should take
        3. annotations: Important context or warnings
        4. confidence: 0.0-1.0 confidence in the response
        
        Make it conversational but informative. Include specific details from the data.
        Respond in JSON format.
        """
        
        # Prepare context for LLM
        context = {
            "original_query": state.get("user_query"),
            "query_analysis": {
                "type": state.get("query_type"),
                "intent": state.get("intent")
            },
            "execution_summary": {
                "tools_executed": len(state.get("executed_tools", [])),
                "success_count": len([r for r in state.get("mcp_results", []) if r.get("success")])
            },
            "key_findings": state.get("incident_analysis", {}),
            "enrichment_data": state.get("enrichment_data", {})
        }
        
        try:
            response = await self.openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Generate response for: {context}"}
                ],
                temperature=self.temperature
            )
            
            import json
            enriched_response = json.loads(response.choices[0].message.content)
            logger.info(f"✨ LLM Response Generation: Generated {len(enriched_response.get('forward_links', []))} forward links")
            
            return enriched_response
            
        except Exception as e:
            logger.error(f"❌ LLM response generation failed: {str(e)}")
            return self._fallback_response_generation(state)
    
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
                "investigation_strategy": "Broad incident investigation"
            }
        else:
            return {
                "is_multi_part": False,
                "sub_queries": [user_query],
                "query_type": "exploration",
                "intent": "explore_data",
                "entities": [],
                "confidence_score": 0.6,
                "specificity_level": "low",
                "investigation_strategy": "General data exploration"
            }
    
    def _fallback_tool_planning(self, query_analysis: Dict[str, Any], available_tools: List[str]) -> List[str]:
        """Fallback tool planning using simple rules"""
        query_type = query_analysis.get("query_type", "general")
        
        if query_type == "incident_analysis":
            return [tool for tool in ["search_logs", "get_incidents", "search_changelogs"] if tool in available_tools]
        else:
            return [tool for tool in ["get_database_stats", "get_schema"] if tool in available_tools]
    
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
            "root_causes": ["Unable to analyze without LLM"],
            "correlations": [],
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
                "tools": ["get_database_stats", "get_schema"],
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

# Global instance
llm_client = LLMDecisionMaker()