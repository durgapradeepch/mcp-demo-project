"""
Query Analysis Agent - LLM-powered query analysis and strategy determination
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from state import ChatState, update_state_context
from utils.llm_client import llm_client

logger = logging.getLogger(__name__)

class QueryAnalysisAgent:
    """
    LLM-powered agent for analyzing user queries and determining:
    - Query type and intent (using LLM)
    - Entity extraction (using LLM)
    - Investigation strategy (using LLM)
    - Confidence scoring (using LLM)
    """
    
    def __init__(self):
        self.name = "QueryAnalysisAgent"
        self.llm = llm_client
    
    async def analyze_query(self, state: ChatState, available_tools: Optional[List[str]] = None) -> ChatState:
        """
        Main LLM-powered analysis method that replaces all hardcoded pattern matching
        """
        try:
            logger.info(f"🔍 LLM Analyzing query: '{state['user_query']}'")
            
            user_query = state["user_query"]
            
            # If no tools provided as an argument, get them from the state
            if available_tools is None:
                available_tools = state.get("available_tools", [])

            # If still no tools found (e.g., state was empty), use a hardcoded default
            if not available_tools:
                logger.warning("No available_tools in state, using hardcoded fallback list.")
                available_tools = [
                    "search_logs", "get_incidents", "search_changelogs", "get_resources",
                    "get_database_stats", "get_schema", "query_nodes", "get_node_labels",
                    "get_incident_by_id", "get_resource_by_id", "search_resources"
                ]
            else:
                logger.info(f"✅ Using {len(available_tools)} tools from state (agent no longer blind)")
            
            # Use LLM for comprehensive query analysis
            llm_analysis = await self.llm.analyze_query_intent(user_query, available_tools)
            
            # Update state with LLM analysis results
            updated_state = {
                **state,
                "query_type": llm_analysis.get("query_type", "general"),
                "intent": llm_analysis.get("intent", "unknown"),
                "entities": llm_analysis.get("entities", []),
                "confidence_score": llm_analysis.get("confidence_score", 0.5),
                "specificity_level": llm_analysis.get("specificity_level", "medium"),
                "current_agent": self.name
            }
            
            # Add comprehensive analysis context
            analysis_context = {
                "llm_analysis": llm_analysis,
                "investigation_strategy": llm_analysis.get("investigation_strategy", "Standard approach"),
                "analysis_timestamp": datetime.now().isoformat(),
                "available_tools_count": len(available_tools),
                "analysis_method": "LLM-powered"
            }
            
            updated_state = update_state_context(updated_state, "query_analysis", analysis_context)
            
            logger.info(f"✅ LLM Query analysis complete: Type={llm_analysis.get('query_type')}, Confidence={llm_analysis.get('confidence_score', 0):.2f}")
            
            return updated_state
            
        except Exception as e:
            logger.error(f"❌ LLM Query analysis failed: {str(e)}")
            # Fallback to basic analysis
            return await self._fallback_analysis(state)
    
    async def _fallback_analysis(self, state: ChatState) -> ChatState:
        """
        Fallback analysis when LLM is unavailable
        CRITICAL: Check for conversational/memory queries FIRST
        """
        logger.warning("🔄 Using fallback query analysis")
        
        user_query = state["user_query"].lower()
        
        # 1. Check for Conversational / Memory questions FIRST (highest priority)
        personal_keywords = ["my name", "who am i", "who are you", "remember", "previous", 
                           "last message", "what did i", "hi", "hello", "hey", "thanks", 
                           "thank you", "bye", "goodbye"]
        if any(word in user_query for word in personal_keywords):
            query_type = "conversational"
            intent = "chat_with_memory"
            confidence = 0.9
            logger.info("🎯 Fallback detected CONVERSATIONAL query - routing to memory path")
        # 2. Then check for SRE/technical keywords
        elif any(word in user_query for word in ["error", "incident", "problem", "failure", "outage", "pod", "log"]):
            query_type = "incident_analysis"
            intent = "investigate_issue"
            confidence = 0.7
        elif any(word in user_query for word in ["show", "list", "get", "display", "explore"]):
            query_type = "exploration"
            intent = "explore_data"
            confidence = 0.6
        else:
            query_type = "general"
            intent = "general_inquiry"
            confidence = 0.5
        
        return {
            **state,
            "query_type": query_type,
            "intent": intent,
            "entities": [],
            "confidence_score": confidence,
            "specificity_level": "medium",
            "current_agent": self.name,
            "context_data": {
                **state.get("context_data", {}),
                "query_analysis": {
                    "analysis_method": "fallback",
                    "analysis_timestamp": datetime.now().isoformat()
                }
            }
        }