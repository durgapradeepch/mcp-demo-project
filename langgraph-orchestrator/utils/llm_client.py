"""
LLM Client for dynamic decision making throughout the LangGraph workflow
"""

import os
import logging
from datetime import datetime
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
    
    def _extract_json_from_response(self, content: str) -> str:
        """Extract JSON from LLM response that might be wrapped in markdown code blocks"""
        import re
        
        # Try to extract JSON from markdown code blocks first
        json_match = re.search(r'```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```', content, re.DOTALL)
        if json_match:
            return json_match.group(1)
        
        # Try to extract JSON object (more common for single analysis results)
        json_match = re.search(r'(\{.*\})', content, re.DOTALL)
        if json_match:
            extracted = json_match.group(1)
            # Check if there are multiple JSON objects separated by commas (common LLM mistake)
            # Pattern: {...}, {...}
            if re.search(r'\}\s*,\s*\{', extracted):
                # Wrap them in an array
                logger.warning("⚠️ Detected multiple JSON objects without array wrapper, fixing...")
                return f"[{extracted}]"
            return extracted
        
        # Try to extract JSON array (for lists of results)
        json_match = re.search(r'(\[.*\])', content, re.DOTALL)
        if json_match:
            return json_match.group(1)
        
        return content
    
    async def analyze_query_intent(self, user_query: str, available_tools: List[str], conversation_history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Use LLM to analyze user query and determine intent, entities, and strategy.
        Handles both single and multi-part queries.
        Includes ambiguity detection for production nudge-back loop.
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
        
        system_prompt = f"""
        You are a query analysis expert and semantic router. Your job is to route queries to the correct handler.
        
        Available Tools: {', '.join(available_tools)}
        
        AMBIGUITY DETECTION RULES (CHECK FIRST):
        Check if the query is missing critical context required to execute tools.
        1. Missing Time/Reference: "What changed?" (When? Which incident?)
        2. Missing Entity: "Why is it slow?" (What is "it"? Which service/resource/pod?)
        3. Vague Pronouns: "this", "that", "the issue", "the problem" without clear antecedent
        4. Ambiguous Scope: "Show me errors" (Which service? What timeframe?)
        
        If ambiguous:
        - Set "is_ambiguous": true
        - Generate a specific "clarification_question" to ask the user (e.g., "Which service are you referring to?")
        - List "missing_info" array (e.g., ["service_name", "timeframe"])
        
        ROUTING RULES (AFTER AMBIGUITY CHECK):
        1. "conversational": 
           - Greetings (hi, hello, hey)
           - Personal questions (what is my name?, who are you?, who am i?)
           - References to previous messages (what did I just ask?, explain that again, remember when I said)
           - Questions about YOU (the AI assistant)
           - Memory-based queries (what did we discuss?, recap our conversation)
           - USE THIS TYPE IF NO EXTERNAL TOOLS/DATA ARE NEEDED - ANSWER FROM CHAT HISTORY
           
        2. "incident_analysis" / "exploration" / "general":
           - Questions requiring DATA from external systems (logs, pods, errors, status, resources)
           - Infrastructure queries ("What is failing?", "Show me metrics", "Check database")
           - Technical investigations requiring tools
        
        DECISION PROCESS:
        - If the answer is in conversation history → "conversational"
        - If the answer needs external data/tools → use appropriate technical type
        
        CONVERSATION HISTORY (for context):
        {conversation_context}
        
        Analyze the user query and provide JSON:
        {{
            "query_type": "conversational" | "incident_analysis" | "exploration" | "root_cause" | "data_retrieval" | "general",
            "intent": "brief description",
            "entities": [],
            "confidence_score": float (0.0-1.0),
            "is_multi_part": boolean,
            "requires_memory": boolean (true if answer is in chat history),
            "requires_tools": boolean (true if needs external data),
            "is_ambiguous": boolean,
            "clarification_question": string (or null if not ambiguous),
            "missing_info": ["list", "of", "missing", "context"]
        }}
        
        EXAMPLES:
        - "What is my name?" → {{"query_type": "conversational", "requires_memory": true, "requires_tools": false}}
        - "Show me failing pods" → {{"query_type": "incident_analysis", "requires_memory": false, "requires_tools": true}}
        - "Hi there" → {{"query_type": "conversational", "requires_memory": false, "requires_tools": false}}
        
        Respond in JSON format only.
        """
        
        try:
            # Build simple messages array (don't include full conversation history in messages)
            response = await self.openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"User Query: {user_query}"}
                ],
                temperature=self.temperature
            )
            
            import json
            content = response.choices[0].message.content or "{}"
            json_str = self._extract_json_from_response(content)
            
            # Clean whitespace from extracted JSON
            json_str = json_str.strip()
            
            analysis = json.loads(json_str)
            logger.info(f"🧠 LLM Query Analysis: {analysis['query_type']} (confidence: {analysis['confidence_score']})")
            
            return analysis
            
        except Exception as e:
            logger.error(f"❌ LLM query analysis failed: {str(e)}")
            if 'content' in locals():
                logger.error(f"Raw LLM response: {content}")
            if 'json_str' in locals():
                logger.error(f"Extracted JSON: {json_str}")
            return self._fallback_query_analysis(user_query)
    
    async def plan_tool_sequence(self, query_analysis: Dict[str, Any], available_tools: List[str], 
                               context: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Use LLM to dynamically plan tool execution sequence with parameters based on query and available tools
        Returns list of dicts with 'name' and 'parameters' keys
        """
        if not self.openai_client:
            return self._fallback_tool_planning(query_analysis, available_tools)
        
        logger.info(f"🔧 Available tools for planning: {available_tools[:10]}...")  # Show first 10
        
        context_info = f"Previous context: {context}" if context else "No previous context"
        
        # Extract key information from query analysis for parameter planning
        entities = query_analysis.get("entities", [])
        intent = query_analysis.get("intent", "")
        query_type = query_analysis.get("query_type", "")
        
        system_prompt = f"""
        You are a tool orchestration expert. Plan the optimal sequence of tools with parameters to answer the user's query.
        
        CURRENT DATE/TIME: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')} (Use this for relative date calculations)
        
        Available Tools: {', '.join(available_tools)}
        
        Query Analysis:
        - Type: {query_type}
        - Intent: {intent}
        - Entities: {entities}
        {context_info}
        
        Consider:
        - Dependencies between tools (some tools need results from others)
        - Efficiency (parallel vs sequential execution)
        - Query specificity (broad investigation vs targeted lookup)
        - Extract parameters from the query analysis (IDs, filters, limits, etc.)
        
        TOOL ROUTING RULES (CRITICAL):
        1. COUNT/AGGREGATE QUERIES FOR CHANGE EVENTS:
           - If user asks for COUNT, TOTAL, HOW MANY, AGGREGATE of change events, changelogs, deployments, or bucket operations
           - ALWAYS use query_logs tool (NOT search_logs, NOT query_nodes, NOT search_incidents)
           - Examples: 
             * "count of create bucket events" -> query_logs
             * "how many deployments on Nov 16th" -> query_logs  
             * "total change events for AWS" -> query_logs
             * "aggregate changes by service" -> query_logs
        
        2. QUERY_LOGS SYNTAX (LogSQL):
           - Use LogSQL syntax for filtering logs/events
           - MUST include time filters: start_time and end_time parameters
           - For specific dates: start_time="2025-11-16T00:00:00Z", end_time="2025-11-16T23:59:59Z"
           - For text matching: query='_msg:~"create bucket"' or query='provider:AWS AND _msg:~"bucket"'
           - Examples:
             * Count create bucket on Nov 16: query_logs(query='_msg:~"create bucket"', start_time="2025-11-16T00:00:00Z", end_time="2025-11-16T23:59:59Z", limit=1000)
             * AWS events: query_logs(query='provider:AWS', start_time="...", end_time="...", limit=1000)
        
        SEARCH OPTIMIZATION RULES (CRITICAL FOR SEARCH RECALL):
        1. BROADENING STRATEGY: If the user provides a specific, complex name (e.g., "Mit-runtime-api-services"), 
           extract the CORE identifier for search (e.g., "runtime-api" or "runtime").
           - Remove organization prefixes: "Mit-", "Acme-", "Org-", "AWS-", "GCP-"
           - Remove environment suffixes: "-prod", "-staging", "-dev", "-test", "-v1", "-v2"
           - Remove generic suffixes: "-services", "-service", "-api", "-app", "-web"
           - Keep the core business identifier (the actual resource name)
        
        2. NOISE REMOVAL: Clean search terms to improve matching:
           - Remove hyphens/underscores if they might not match: "runtime-api" -> "runtime" 
           - Consider partial matches over exact matches
           - For incident/log searches, focus on the resource/service name, not the full technical identifier
        
        3. MULTI-TERM FALLBACK (Path D - Smart Search): For critical searches (incidents, errors, alerts, logs), 
           ALWAYS plan TWO searches to maximize recall:
           - Search 1: Broad core term (e.g., "runtime") - Highest recall
           - Search 2: Specific core term (e.g., "runtime-api") - Higher precision
           DO NOT include the original complex term unless it's already simple.
           This ensures you don't miss data due to naming variations or database inconsistencies.
        
        4. EXAMPLES OF QUERY EXPANSION:
           - User: "incidents on Mit-runtime-api-services" 
             -> Plan: [search_incidents(query="runtime"), search_incidents(query="runtime-api")]
             Rationale: Strips "Mit-" prefix and "-services" suffix, searches broad + specific
           
           - User: "errors in acme-checkout-service-prod"
             -> Plan: [search_logs(query="checkout"), search_logs(query="checkout service")]
             Rationale: Strips "acme-" prefix and "-service-prod" suffix
           
           - User: "check aws-eks-cluster-2"
             -> Plan: [query_nodes(query="eks"), query_nodes(query="eks-cluster")]
             Rationale: Strips "aws-" prefix and "-2" version number
           
           - User: "show me checkout incidents" (Simple term)
             -> Plan: [search_incidents(query="checkout")]
             Rationale: Already simple, no expansion needed
        
        5. WHEN TO APPLY: Apply Query Expansion ONLY for search tools (search_incidents, search_logs, 
           search_changelogs, query_nodes, search_nodes). Do NOT apply for:
           - get_by_id tools (need exact IDs)
           - Neo4j schema tools (get_node_labels, get_schema, get_node_count)
           - Exact match tools where user provides specific filters
        
        CRITICAL: Respond with a valid JSON array ONLY. Do not include any explanation or text outside the JSON.
        
        Example for single tool:
        [{{"name": "search_logs", "parameters": {{"query": "level:ERROR", "limit": 50}}}}]
        
        Example for multiple tools (with fallback):
        [
            {{"name": "search_incidents", "parameters": {{"query": "runtime"}}}},
            {{"name": "search_changelogs", "parameters": {{"query": "runtime"}}}}
        ]
        
        For Neo4j tools (get_node_count, get_node_labels, get_schema), use empty parameters {{}}.
        For search tools, extract and CLEAN search terms from the intent (apply BROADENING rules).
        For get_by_id tools, extract IDs from entities if present.
        
        Always return a JSON array, even for a single tool: [{{"name": "...", "parameters": {{...}}}}]
        """
        
        try:
            response = await self.openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Plan tools for: {intent}"}
                ],
                temperature=self.temperature
            )
            
            import json
            content = response.choices[0].message.content or "[]"
            json_str = self._extract_json_from_response(content)
            logger.info(f"🔍 LLM Tool Planning Raw Response: {json_str[:200]}")
            tool_plan_raw = json.loads(json_str)
            
            # Handle case where LLM returns single dict instead of array
            if isinstance(tool_plan_raw, dict):
                tool_plan = [tool_plan_raw]
            elif isinstance(tool_plan_raw, list):
                tool_plan = tool_plan_raw
            else:
                tool_plan = []
            
            # Validate tools exist and have correct structure
            valid_plan = []
            for tool_item in tool_plan:
                if isinstance(tool_item, dict) and "name" in tool_item:
                    tool_name = tool_item["name"]
                    if tool_name in available_tools:
                        valid_plan.append({
                            "name": tool_name,
                            "parameters": tool_item.get("parameters", {})
                        })
            
            logger.info(f"🛠️ LLM Tool Planning: {len(valid_plan)} tools planned with parameters")
            for tool in valid_plan:
                logger.info(f"   - {tool['name']}: {tool['parameters']}")
            
            return valid_plan
            
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
            logger.info(f"📝 Planning tools for single query with analysis: {query_analysis.get('query_type')}")
            tools = await self.plan_tool_sequence(query_analysis, available_tools)
            logger.info(f"🔧 Tools planned for execution: {tools}")
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
            "1. For each sub-query, determine required tools WITH their parameters\n"
            "2. Identify dependencies between sub-queries\n"
            "3. Decide execution order and parallelization opportunities\n"
            "4. Assign priority levels (1=highest, 5=lowest)\n"
            "5. Extract parameters from the sub-query intent (IDs, filters, limits, etc.)\n\n"
            "IMPORTANT: Each tool must be a dict with 'name' and 'parameters' keys.\n\n"
            "Respond with JSON:\n"
        )

        json_example = (
            '{\n'
            '    "execution_type": "sequential" or "parallel" or "mixed",\n'
            '    "query_plan": {\n'
            '        "query_1": {\n'
            '            "query": "sub-query text",\n'
            '            "tools": [\n'
            '                {"name": "tool1", "parameters": {"param1": "value"}},\n'
            '                {"name": "tool2", "parameters": {}}\n'
            '            ],\n'
            '            "priority": 1,\n'
            '            "depends_on": []\n'
            '        },\n'
            '        "query_2": {\n'
            '            "query": "sub-query text", \n'
            '            "tools": [\n'
            '                {"name": "tool3", "parameters": {"status": "open"}}\n'
            '            ],\n'
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
            # Build messages for planning
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Analyze this query: {user_query}"}
            ]
            
            response = await self.openai_client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature
            )
            
            import json
            content = response.choices[0].message.content or "{}"
            json_str = self._extract_json_from_response(content)
            execution_plan = json.loads(json_str)
            
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
            
            route = (response.choices[0].message.content or "response_enrichment").strip()
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
            content = response.choices[0].message.content or "{}"
            json_str = self._extract_json_from_response(content)
            analysis = json.loads(json_str)
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
        
        from datetime import datetime
        current_date = datetime.now().strftime("%Y-%m-%d")
        
        system_prompt = f"""
        You are a helpful assistant generating responses for database investigations.
        
        CRITICAL ANTI-HALLUCINATION RULES:
        1. GROUNDING: You must ONLY use the data provided in 'tool_results'.
        2. ZERO DATA: If 'tool_results' is empty or contains zero items, you MUST state "No data found."
        3. NO INVENTION: NEVER invent Incident IDs (e.g., INC-123, 1513), timestamps, names (e.g., Stephen Sheen), or error messages.
        4. VERIFICATION: If you mention an entity (Pod, Incident, Log, Service), it MUST exist in the provided JSON.
        5. EXPLICIT CHECK: If metrics.total_data_points_found is 0, you MUST say "No results found" - do NOT fabricate data.
        
        CRITICAL TEMPORAL AWARENESS:
        - TODAY'S DATE: {current_date}
        - When analyzing incidents, changelogs, or events, ALWAYS check their timestamps
        - For "current failure" or "what is failing NOW" queries, prioritize data from the LAST 24-48 HOURS
        - If you cite historical incidents (>7 days old) for current failures, you MUST explain why they're still relevant
        - PREFER current resource status (pod failures, OOMKilled, restarts) over old incident reports
        - If incidents are weeks/months old, they are PROBABLY NOT the cause of current issues
        
        REASONING CHAIN (think through this):
        1. What is the user asking about? (current issue vs historical analysis)
        2. What timestamps do I see in the tool_results?
        3. How old is this data relative to today ({current_date})?
        4. Does the age match the query intent? (e.g., "current failure" needs recent data)
        5. Do I see CURRENT resource failures (OOMKilled, CrashLoopBackOff) in the data?
        6. If citing old incidents for current problems, is there a clear causal link?
        
        PRIORITY ORDER for "current failure" queries:
        1. Current resource status (pods failing NOW, restart counts, OOMKilled today)
        2. Recent logs from last 24 hours
        3. Incidents from last 48 hours
        4. Only cite older data if explicitly linked to ongoing issues
        
        IMPORTANT: Use the actual data from tool_results to answer the user's question.
        Do NOT give instructions on how to query - the tools have already been executed.
        Provide the actual answer based on the data returned.
        
        Create a comprehensive response that includes:
        1. final_response: Clear answer using the ACTUAL DATA from tool_results with proper temporal context
        2. forward_links: List of specific next actions the user could take
        3. annotations: Important context or warnings (include temporal relevance notes)
        4. confidence: 0.0-1.0 confidence in the response
        5. temporal_analysis: Brief note on data recency and relevance
        
        Make it conversational but informative. Include specific numbers, timestamps, and temporal context.
        Respond in JSON format.
        """
        
        # Prepare context for LLM - include actual tool results data with explicit counts
        mcp_results = state.get("mcp_results", [])
        tool_data = []
        total_items_found = 0  # Count actual data to prevent hallucination
        
        for result in mcp_results:
            if result.get("success"):
                data = result.get("result", {})
                
                # Calculate explicit item count for this tool result
                count = 0
                if isinstance(data, list):
                    count = len(data)
                elif isinstance(data, dict):
                    # Navigate nested structure to find actual data arrays
                    # MCP tools return: {success: true, data: {result: {incidents: [...]}}}
                    nested_data = data.get("data", {}).get("result", data)
                    
                    # Check for common list keys in nested structure
                    if "incidents" in nested_data:
                        count = len(nested_data["incidents"]) if isinstance(nested_data["incidents"], list) else 0
                    elif "logs" in nested_data:
                        count = len(nested_data["logs"]) if isinstance(nested_data["logs"], list) else 0
                    elif "results" in nested_data:
                        count = len(nested_data["results"]) if isinstance(nested_data["results"], list) else 0
                    elif "nodes" in nested_data:
                        count = len(nested_data["nodes"]) if isinstance(nested_data["nodes"], list) else 0
                    else:
                        # Only count as 1 if there's actual meaningful data
                        count = 1 if (data and data != {} and data.get("data") != {}) else 0
                else:
                    count = 1 if data else 0
                
                total_items_found += count
                
                tool_data.append({
                    "tool": result.get("tool"),
                    "item_count": count,  # Explicitly show count to LLM
                    "data": data
                })
                
                # DEBUG: Log what data we got
                logger.info(f"🔍 Tool {result.get('tool')} returned: count={count}, data_preview={str(data)[:200]}")
        
        context = {
            "original_query": state.get("user_query"),
            "query_analysis": {
                "type": state.get("query_type"),
                "intent": state.get("intent")
            },
            "tool_results": tool_data,  # ACTUAL DATA from tools with counts
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
            response = await self.openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Generate response for: {context}"}
                ],
                temperature=self.temperature
            )
            
            import json
            content = response.choices[0].message.content or "{}"
            json_str = self._extract_json_from_response(content)
            enriched_response = json.loads(json_str)
            
            # Normalize response key - LLM might use "response" or "final_response"
            if "response" in enriched_response and "final_response" not in enriched_response:
                enriched_response["final_response"] = enriched_response.get("response", "")
            
            logger.info(f"✨ LLM Response Generation: Generated {len(enriched_response.get('forward_links', []))} forward links")
            logger.info(f"✨ Response text length: {len(enriched_response.get('final_response', ''))}")
            
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
    
    def _fallback_tool_planning(self, query_analysis: Dict[str, Any], available_tools: List[str]) -> List[Dict[str, Any]]:
        """Fallback tool planning using simple rules - returns list of dicts with name and parameters"""
        query_type = query_analysis.get("query_type", "general")
        
        if query_type == "incident_analysis":
            tools = [tool for tool in ["search_logs", "get_incidents", "search_changelogs"] if tool in available_tools]
        else:
            tools = [tool for tool in ["get_node_count", "get_node_labels", "get_schema"] if tool in available_tools]
        
        # Convert to list of dicts with parameters
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