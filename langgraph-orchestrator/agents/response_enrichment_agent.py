"""
Response Enrichment Agent - Enriches responses with context, annotations, and forward links
"""

import logging
from typing import Dict, Any, List
from datetime import datetime
from state import ChatState, update_state_context
from utils.llm_client import llm_client
from utils.llm_client import llm_client

logger = logging.getLogger(__name__)

class ResponseEnrichmentAgent:
    """
    Specialized agent for enriching responses with:
    - Forward linking suggestions
    - Contextual annotations
    - Additional insights
    - Actionable recommendations
    """
    
    def __init__(self):
        self.name = "ResponseEnrichmentAgent"
        
        # Enrichment templates
        self.forward_link_templates = {
            "incident_analysis": [
                "Investigate related incidents in the past week",
                "Check health status of affected resources",
                "Review recent deployments to related systems",
                "Analyze error patterns for similar services"
            ],
            "exploration": [
                "Get detailed statistics for this data",
                "Explore relationships between these entities",
                "Check recent activity on these resources",
                "View configuration details"
            ],
            "root_cause": [
                "Create incident report for this issue",
                "Set up monitoring alerts for similar patterns",
                "Review change management process",
                "Schedule post-incident review"
            ]
        }
    
    async def enrich_response(self, state: ChatState) -> ChatState:
        """Main response enrichment orchestration using LLM intelligence"""
        try:
            logger.info("✨ Enriching response with LLM-powered context and insights")
            
            # Use LLM to generate comprehensive enriched response
            try:
                llm_response = await llm_client.generate_enriched_response(
                    user_query=state.get("user_query", ""),
                    query_analysis=state.get("query_analysis", {}),
                    mcp_results=state.get("mcp_results", []),
                    incident_analysis=state.get("incident_analysis", {}),
                    execution_context=state.get("context_data", {})
                )
                
                # Extract LLM-generated content
                final_response = llm_response.get("response", "")
                forward_links = llm_response.get("forward_links", [])
                recommendations = llm_response.get("recommendations", [])
                insights = llm_response.get("insights", {})
                
            except Exception as llm_error:
                logger.warning(f"LLM response generation failed: {llm_error}, using fallback")
                
                # Fallback to traditional methods
                forward_links = self._generate_forward_links(state)
                recommendations = self._generate_recommendations(state)
                insights = self._extract_contextual_insights(state)
                final_response = await self._format_final_response(state, insights)
            
            # Always generate annotations (not LLM dependent)
            annotations = self._create_annotations(state)
            
            # Compile enrichment data
            enrichment_data = {
                "forward_links": forward_links,
                "annotations": annotations,
                "contextual_insights": insights,
                "recommendations": recommendations,
                "enrichment_timestamp": datetime.now().isoformat(),
                "enrichment_quality": self._assess_enrichment_quality(forward_links, annotations, insights)
            }
            
            # Update state
            updated_state = {
                **state,
                "enrichment_data": enrichment_data,
                "forward_links": forward_links,
                "annotations": annotations,
                "final_response": final_response,
                "current_agent": self.name
            }
            
            logger.info(f"✅ Response enrichment completed with {len(forward_links)} forward links")
            
            return updated_state
            
        except Exception as e:
            logger.error(f"❌ Response enrichment failed: {str(e)}")
            # Return basic response without enrichment
            return {
                **state,
                "final_response": self._create_fallback_response(state),
                "error_count": state.get("error_count", 0) + 1
            }
    
    def _generate_forward_links(self, state: ChatState) -> List[str]:
        """Generate intelligent forward link suggestions"""
        
        forward_links = []
        query_type = state.get("query_type", "general")
        
        # Get template links for query type
        template_links = self.forward_link_templates.get(query_type, [])
        forward_links.extend(template_links[:3])  # Take first 3 template links
        
        # Generate context-specific links based on MCP results
        context_links = self._generate_context_specific_links(state)
        forward_links.extend(context_links)
        
        # Generate links based on incident analysis if available
        if state.get("incident_analysis"):
            incident_links = self._generate_incident_links(state["incident_analysis"])
            forward_links.extend(incident_links)
        
        # Generate links based on discovered entities
        entity_links = self._generate_entity_links(state)
        forward_links.extend(entity_links)
        
        # Remove duplicates and limit
        unique_links = list(dict.fromkeys(forward_links))
        return unique_links[:8]  # Limit to 8 forward links
    
    def _generate_context_specific_links(self, state: ChatState) -> List[str]:
        """Generate links based on MCP tool results"""
        
        links = []
        
        for result in state.get("mcp_results", []):
            if not result.get("success"):
                continue
                
            tool_name = result["tool_name"]
            data = result.get("result", {}).get("data", result.get("result", {}))
            
            # Links based on specific tools
            if tool_name == "search_logs" and isinstance(data, dict):
                if data.get("logs"):
                    links.append("Analyze log patterns over a longer time period")
                    links.append("Set up alerts for similar log patterns")
            
            elif tool_name in ["get_incidents", "search_incidents"]:
                if isinstance(data, dict) and data.get("incidents"):
                    links.append("Review incident trends and patterns")
                    links.append("Check status of related incidents")
            
            elif tool_name in ["get_changelogs", "search_changelogs"]:
                if isinstance(data, dict) and data.get("changelogs"):
                    links.append("Review change management process")
                    links.append("Analyze impact of recent changes")
            
            elif tool_name in ["get_resources", "get_resource_by_id"]:
                if isinstance(data, dict):
                    links.append("Monitor resource health and performance")
                    links.append("Review resource configuration")
        
        return links
    
    def _generate_incident_links(self, incident_analysis: Dict[str, Any]) -> List[str]:
        """Generate links based on incident analysis results"""
        
        links = []
        
        # Links based on root causes
        root_causes = incident_analysis.get("root_causes", [])
        if root_causes:
            links.append("Create prevention measures for identified root causes")
            links.append("Schedule team review of incident response")
        
        # Links based on impact
        impact = incident_analysis.get("impact_analysis", {})
        if impact.get("impact_level") == "high":
            links.append("Escalate to management and create action plan")
            links.append("Conduct post-incident review meeting")
        
        # Links based on affected resources
        affected_resources = impact.get("affected_resources", [])
        if len(affected_resources) > 3:
            links.append("Perform comprehensive health check on all affected resources")
        
        return links
    
    def _generate_entity_links(self, state: ChatState) -> List[str]:
        """Generate links based on entities found in the query"""
        
        links = []
        entities = state.get("entities", [])
        
        for entity in entities:
            entity_type = entity.get("type")
            entity_value = entity.get("value")
            
            if entity_type == "resource_id":
                links.append(f"Get detailed configuration for resource {entity_value}")
                links.append(f"Check performance metrics for {entity_value}")
            
            elif entity_type == "incident_id":
                links.append(f"Get full timeline for incident {entity_value}")
                links.append(f"Review related incidents to {entity_value}")
        
        return links
    
    def _create_annotations(self, state: ChatState) -> List[str]:
        """Create contextual annotations for the response"""
        
        annotations = []
        
        # Quality annotations
        confidence_score = state.get("confidence_score", 0)
        if confidence_score < 0.7:
            annotations.append("⚠️ Analysis confidence is moderate - consider gathering more information")
        
        # Data quality annotations
        execution_stats = state.get("context_data", {}).get("execution_stats", {})
        success_rate = execution_stats.get("success_rate", 1.0)
        if success_rate < 0.8:
            annotations.append("⚠️ Some data sources were unavailable - results may be incomplete")
        
        # Analysis-specific annotations
        if state.get("incident_analysis"):
            incident_analysis = state["incident_analysis"]
            
            # Root cause annotations
            root_causes = incident_analysis.get("root_causes", [])
            if len(root_causes) > 3:
                annotations.append("💡 Multiple potential root causes identified - prioritize by confidence score")
            
            # Timeline annotations
            timeline = incident_analysis.get("timeline", [])
            if len(timeline) > 20:
                annotations.append("📊 Complex incident with many events - timeline analysis available")
        
        # Tool execution annotations
        executed_tools = state.get("executed_tools", [])
        if len(executed_tools) > 5:
            annotations.append("🔍 Comprehensive analysis performed across multiple data sources")
        
        return annotations
    
    def _extract_contextual_insights(self, state: ChatState) -> Dict[str, Any]:
        """Extract key insights from the analysis"""
        
        insights = {
            "key_findings": [],
            "patterns_detected": [],
            "risk_indicators": [],
            "performance_metrics": {}
        }
        
        # Extract key findings from incident analysis
        if state.get("incident_analysis"):
            incident_analysis = state["incident_analysis"]
            
            # Key findings from root causes
            root_causes = incident_analysis.get("root_causes", [])
            for root_cause in root_causes[:3]:
                insights["key_findings"].append({
                    "finding": root_cause["description"],
                    "confidence": root_cause["confidence"],
                    "type": "root_cause"
                })
            
            # Pattern detection
            correlations = incident_analysis.get("correlations", [])
            if correlations:
                insights["patterns_detected"].append({
                    "pattern": f"{len(correlations)} incident correlations found",
                    "significance": "high" if len(correlations) > 2 else "medium"
                })
        
        # Extract findings from MCP results
        mcp_findings = self._extract_mcp_insights(state.get("mcp_results", []))
        insights["key_findings"].extend(mcp_findings)
        
        # Performance metrics
        execution_stats = state.get("context_data", {}).get("execution_stats", {})
        if execution_stats:
            insights["performance_metrics"] = {
                "tools_executed": execution_stats.get("successful_tools", 0),
                "success_rate": f"{execution_stats.get('success_rate', 0):.1%}",
                "analysis_depth": state.get("investigation_depth", 1)
            }
        
        return insights
    
    def _extract_mcp_insights(self, mcp_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract insights from MCP tool results"""
        
        insights = []
        
        for result in mcp_results:
            if not result.get("success"):
                continue
            
            tool_name = result["tool_name"]
            data = result.get("result", {}).get("data", result.get("result", {}))
            
            if tool_name == "get_database_stats" and isinstance(data, dict):
                total_nodes = data.get("total_nodes", 0)
                if total_nodes > 1000:
                    insights.append({
                        "finding": f"Large dataset detected: {total_nodes:,} nodes in database",
                        "confidence": 1.0,
                        "type": "data_scale"
                    })
            
            elif tool_name == "search_logs" and isinstance(data, dict):
                logs = data.get("logs", [])
                error_logs = [log for log in logs if log.get("level", "").upper() == "ERROR"]
                if len(error_logs) > 10:
                    insights.append({
                        "finding": f"High error volume: {len(error_logs)} error logs found",
                        "confidence": 0.9,
                        "type": "error_pattern"
                    })
        
        return insights
    
    def _generate_recommendations(self, state: ChatState) -> List[str]:
        """Generate actionable recommendations"""
        
        recommendations = []
        
        # Recommendations from incident analysis
        if state.get("incident_analysis"):
            analysis_recommendations = state["incident_analysis"].get("recommendations", [])
            recommendations.extend(analysis_recommendations[:3])
        
        # Query-type specific recommendations
        query_type = state.get("query_type", "general")
        
        if query_type == "incident_analysis":
            recommendations.extend([
                "Document findings in incident management system",
                "Update runbooks based on lessons learned",
                "Schedule follow-up review in 24-48 hours"
            ])
        
        elif query_type == "exploration":
            recommendations.extend([
                "Consider setting up monitoring for explored data",
                "Create dashboard for ongoing visibility"
            ])
        
        # Remove duplicates and limit
        unique_recommendations = list(dict.fromkeys(recommendations))
        return unique_recommendations[:5]
    
    async def _format_final_response(self, state: ChatState, insights: Dict[str, Any]) -> str:
        """Format the final comprehensive response using LLM for intelligent response generation"""
        
        try:
            # Use LLM to generate enriched response
            enriched_response = await llm_client.generate_enriched_response(
                user_query=state.get("user_query", ""),
                query_analysis=state.get("query_analysis", {}),
                mcp_results=state.get("mcp_results", []),
                incident_analysis=state.get("incident_analysis", {}),
                insights=insights
            )
            
            if enriched_response and isinstance(enriched_response, str):
                return enriched_response
            
            # Fallback if LLM doesn't return valid response
            logger.warning("LLM returned invalid response, using fallback formatting")
            
        except Exception as e:
            logger.error(f"Error in LLM response generation, using fallback: {e}")
        
        # Fallback to original formatting logic
        user_query = state["user_query"]
        query_type = state.get("query_type", "general")
        
        response_parts = []
        
        # Opening based on query type
        if query_type == "incident_analysis":
            response_parts.append("🔍 **Incident Analysis Complete**")
        elif query_type == "exploration":
            response_parts.append("📊 **Data Exploration Results**")
        else:
            response_parts.append("✅ **Analysis Complete**")
        
        # Add key findings
        key_findings = insights.get("key_findings", [])
        if key_findings:
            response_parts.append("\n**Key Findings:**")
            for finding in key_findings[:3]:
                confidence_emoji = "🔴" if finding["confidence"] > 0.8 else "🟡" if finding["confidence"] > 0.6 else "⚪"
                response_parts.append(f"• {confidence_emoji} {finding['finding']}")
        
        # Add incident analysis summary if available
        if state.get("incident_analysis"):
            incident_analysis = state["incident_analysis"]
            root_causes = incident_analysis.get("root_causes", [])
            
            if root_causes:
                response_parts.append(f"\n**Root Cause Analysis:** {len(root_causes)} potential causes identified")
                
                for i, cause in enumerate(root_causes[:2], 1):
                    confidence_pct = f"{cause['confidence']:.0%}"
                    response_parts.append(f"{i}. {cause['description']} (Confidence: {confidence_pct})")
        
        # Add performance metrics
        perf_metrics = insights.get("performance_metrics", {})
        if perf_metrics:
            tools_count = perf_metrics.get("tools_executed", 0)
            success_rate = perf_metrics.get("success_rate", "0%")
            response_parts.append(f"\n**Analysis Overview:** {tools_count} data sources analyzed ({success_rate} success rate)")
        
        return "\n".join(response_parts)
    
    def _assess_enrichment_quality(self, forward_links: List[str], 
                                 annotations: List[str], insights: Dict[str, Any]) -> float:
        """Assess the quality of the enrichment"""
        
        quality_score = 0.0
        
        # Score based on forward links
        if len(forward_links) >= 5:
            quality_score += 0.3
        elif len(forward_links) >= 3:
            quality_score += 0.2
        
        # Score based on annotations
        if len(annotations) >= 2:
            quality_score += 0.2
        elif len(annotations) >= 1:
            quality_score += 0.1
        
        # Score based on insights
        key_findings = insights.get("key_findings", [])
        if len(key_findings) >= 3:
            quality_score += 0.3
        elif len(key_findings) >= 1:
            quality_score += 0.2
        
        # Score based on performance metrics
        if insights.get("performance_metrics"):
            quality_score += 0.2
        
        return min(quality_score, 1.0)
    
    def _create_fallback_response(self, state: ChatState) -> str:
        """Create a basic fallback response when enrichment fails"""
        
        user_query = state["user_query"]
        
        # Count successful tool executions
        successful_tools = len([r for r in state.get("mcp_results", []) if r.get("success")])
        
        if successful_tools > 0:
            return f"Analysis completed for your query: '{user_query}'. {successful_tools} data sources were successfully analyzed."
        else:
            return f"I processed your query: '{user_query}', but encountered some issues retrieving data. Please try again or rephrase your question."