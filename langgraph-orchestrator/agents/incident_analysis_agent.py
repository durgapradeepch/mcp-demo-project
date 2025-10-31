"""
Incident Analysis Agent - Specialized agent for analyzing incidents and root causes
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from state import ChatState, update_state_context
from utils.llm_client import llm_client

logger = logging.getLogger(__name__)

class IncidentAnalysisAgent:
    """
    Specialized agent for deep incident analysis, root cause investigation,
    and timeline construction from MCP tool results
    """
    
    def __init__(self):
        self.name = "IncidentAnalysisAgent"
        
        # Analysis thresholds
        self.analysis_thresholds = {
            "correlation_confidence": 0.7,
            "timeline_window_minutes": 60,
            "max_root_causes": 5,
            "min_evidence_pieces": 2
        }
    
    async def analyze_incident_data(self, state: ChatState) -> ChatState:
        """Main incident analysis orchestration using LLM intelligence"""
        try:
            logger.info("🔍 Starting LLM-powered incident analysis")
            
            # Extract incident-related data from MCP results
            incident_data = self._extract_incident_data(state["mcp_results"])
            
            if not incident_data["has_incidents"]:
                logger.info("ℹ️ No incident data found, skipping specialized analysis")
                return state
            
            # Use LLM to analyze incident data intelligently
            llm_analysis = await llm_client.analyze_incident_data(
                user_query=state.get("user_query", ""),
                incident_data=incident_data,
                mcp_results=state.get("mcp_results", [])
            )
            
            # Build incident timeline (still useful for structure)
            timeline = self._build_incident_timeline(incident_data, state["mcp_results"])
            
            # Merge LLM analysis with structured data
            analysis_results = {
                "incident_summary": incident_data["summary"],
                "timeline": timeline,
                "correlations": llm_analysis.get("correlations", []),
                "root_causes": llm_analysis.get("root_causes", []),
                "impact_analysis": llm_analysis.get("impact_analysis", {}),
                "recommendations": llm_analysis.get("recommendations", []),
                "confidence_score": llm_analysis.get("confidence_score", 0.5),
                "analysis_timestamp": datetime.now().isoformat(),
                "llm_insights": llm_analysis.get("insights", "")
            }
            
            # Add fallback analysis if LLM didn't provide complete data
            if not analysis_results["correlations"]:
                analysis_results["correlations"] = self._perform_correlation_analysis(incident_data, state["mcp_results"])
            
            if not analysis_results["root_causes"]:
                analysis_results["root_causes"] = self._identify_root_causes(analysis_results["correlations"], timeline)
            
            # Update state
            updated_state = {
                **state,
                "incident_analysis": analysis_results,
                "current_agent": self.name
            }
            
            logger.info(f"✅ LLM incident analysis completed: {len(analysis_results['root_causes'])} root causes identified")
            
            return updated_state
            
        except Exception as e:
            logger.error(f"❌ Incident analysis failed: {str(e)}")
            return {
                **state,
                "error_count": state.get("error_count", 0) + 1
            }
    
    def _extract_incident_data(self, mcp_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract and structure incident-related data from MCP results"""
        
        incident_data = {
            "has_incidents": False,
            "incidents": [],
            "logs": [],
            "changelogs": [],
            "resources": [],
            "summary": {}
        }
        
        for result in mcp_results:
            if not result.get("success"):
                continue
                
            tool_name = result["tool_name"]
            data = result.get("result", {}).get("data", result.get("result", {}))
            
            if tool_name in ["get_incidents", "search_incidents", "get_incident_by_id"]:
                incidents = self._normalize_incidents_data(data)
                incident_data["incidents"].extend(incidents)
                incident_data["has_incidents"] = len(incidents) > 0
            
            elif tool_name in ["search_logs", "query_logs"]:
                logs = self._normalize_logs_data(data)
                incident_data["logs"].extend(logs)
            
            elif tool_name in ["get_changelogs", "search_changelogs", "get_changelog_by_resource"]:
                changelogs = self._normalize_changelogs_data(data)
                incident_data["changelogs"].extend(changelogs)
            
            elif tool_name in ["get_resources", "get_resource_by_id"]:
                resources = self._normalize_resources_data(data)
                incident_data["resources"].extend(resources)
        
        # Create summary
        incident_data["summary"] = {
            "total_incidents": len(incident_data["incidents"]),
            "total_logs": len(incident_data["logs"]),
            "total_changelogs": len(incident_data["changelogs"]),
            "total_resources": len(incident_data["resources"]),
            "severity_distribution": self._analyze_severity_distribution(incident_data["incidents"])
        }
        
        return incident_data
    
    def _build_incident_timeline(self, incident_data: Dict[str, Any], 
                               mcp_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Build chronological timeline of incident-related events"""
        
        timeline_events = []
        
        # Add incidents to timeline
        for incident in incident_data["incidents"]:
            timeline_events.append({
                "timestamp": incident.get("created_at", incident.get("timestamp")),
                "type": "incident",
                "severity": incident.get("severity", "unknown"),
                "description": f"Incident created: {incident.get('title', 'Unknown incident')}",
                "data": incident,
                "source": "incidents"
            })
        
        # Add logs to timeline
        for log_entry in incident_data["logs"]:
            timeline_events.append({
                "timestamp": log_entry.get("timestamp", log_entry.get("_time")),
                "type": "log_event",
                "severity": log_entry.get("level", "info"),
                "description": f"Log: {log_entry.get('_msg', log_entry.get('message', 'Log event'))}",
                "data": log_entry,
                "source": "logs"
            })
        
        # Add changelogs to timeline
        for changelog in incident_data["changelogs"]:
            timeline_events.append({
                "timestamp": changelog.get("timestamp", changelog.get("created_at")),
                "type": "change_event",
                "severity": changelog.get("severity", "medium"),
                "description": f"Change: {changelog.get('description', 'System change')}",
                "data": changelog,
                "source": "changelogs"
            })
        
        # Sort by timestamp and filter valid entries
        valid_events = [event for event in timeline_events if event.get("timestamp")]
        valid_events.sort(key=lambda x: x["timestamp"])
        
        return valid_events
    
    def _perform_correlation_analysis(self, incident_data: Dict[str, Any], 
                                    mcp_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze correlations between incidents, changes, and logs"""
        
        correlations = []
        
        for incident in incident_data["incidents"]:
            incident_time = self._parse_timestamp(incident.get("created_at", incident.get("timestamp")))
            if not incident_time:
                continue
            
            # Find correlated changes (within time window before incident)
            time_window_start = incident_time - timedelta(minutes=self.analysis_thresholds["timeline_window_minutes"])
            
            correlated_changes = []
            for changelog in incident_data["changelogs"]:
                change_time = self._parse_timestamp(changelog.get("timestamp", changelog.get("created_at")))
                if change_time and time_window_start <= change_time <= incident_time:
                    correlated_changes.append(changelog)
            
            # Find correlated log events
            correlated_logs = []
            for log_entry in incident_data["logs"]:
                log_time = self._parse_timestamp(log_entry.get("timestamp", log_entry.get("_time")))
                if log_time and abs((log_time - incident_time).total_seconds()) <= 1800:  # 30 minutes
                    correlated_logs.append(log_entry)
            
            # Calculate correlation confidence
            confidence = self._calculate_correlation_confidence(
                incident, correlated_changes, correlated_logs
            )
            
            if confidence >= self.analysis_thresholds["correlation_confidence"]:
                correlation = {
                    "incident": incident,
                    "correlated_changes": correlated_changes,
                    "correlated_logs": correlated_logs,
                    "confidence": confidence,
                    "time_window": {
                        "start": time_window_start.isoformat(),
                        "end": incident_time.isoformat()
                    }
                }
                correlations.append(correlation)
        
        # Sort by confidence
        correlations.sort(key=lambda x: x["confidence"], reverse=True)
        
        return correlations
    
    def _identify_root_causes(self, correlations: List[Dict[str, Any]], 
                            timeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify potential root causes from correlations and timeline"""
        
        root_causes = []
        
        for correlation in correlations[:self.analysis_thresholds["max_root_causes"]]:
            
            # Analyze changes as potential root causes
            for change in correlation["correlated_changes"]:
                root_cause = {
                    "type": "change_event",
                    "description": change.get("description", "System change"),
                    "confidence": correlation["confidence"] * 0.9,  # Slightly reduce for change events
                    "evidence": [
                        f"Change occurred {self._get_time_before_incident(change, correlation['incident'])} before incident",
                        f"Correlation confidence: {correlation['confidence']:.2%}"
                    ],
                    "source_data": change,
                    "recommended_actions": self._get_change_actions(change)
                }
                
                # Add additional evidence from logs
                related_error_logs = [
                    log for log in correlation["correlated_logs"] 
                    if log.get("level", "").upper() in ["ERROR", "CRITICAL"]
                ]
                
                if related_error_logs:
                    root_cause["evidence"].append(f"{len(related_error_logs)} error logs found around the same time")
                    root_cause["confidence"] += 0.1
                
                root_causes.append(root_cause)
            
            # Analyze log patterns as root causes
            error_patterns = self._analyze_log_patterns(correlation["correlated_logs"])
            for pattern in error_patterns:
                if pattern["significance"] > 0.7:
                    root_cause = {
                        "type": "log_pattern",
                        "description": f"Error pattern: {pattern['pattern']}",
                        "confidence": pattern["significance"],
                        "evidence": [
                            f"Pattern appears {pattern['count']} times",
                            f"First occurrence: {pattern['first_occurrence']}",
                            f"Pattern significance: {pattern['significance']:.2%}"
                        ],
                        "source_data": pattern,
                        "recommended_actions": self._get_log_pattern_actions(pattern)
                    }
                    root_causes.append(root_cause)
        
        # Sort by confidence and limit results
        root_causes.sort(key=lambda x: x["confidence"], reverse=True)
        return root_causes[:self.analysis_thresholds["max_root_causes"]]
    
    def _assess_incident_impact(self, incident_data: Dict[str, Any], 
                              correlations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Assess the impact and scope of incidents"""
        
        # Collect affected resources
        affected_resources = set()
        for incident in incident_data["incidents"]:
            if "resource_id" in incident:
                affected_resources.add(incident["resource_id"])
        
        for correlation in correlations:
            for change in correlation["correlated_changes"]:
                if "resource_id" in change:
                    affected_resources.add(change["resource_id"])
        
        # Analyze severity distribution
        severity_counts = {}
        for incident in incident_data["incidents"]:
            severity = incident.get("severity", "unknown").lower()
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        # Calculate impact score
        impact_score = self._calculate_impact_score(severity_counts, len(affected_resources))
        
        return {
            "affected_resources_count": len(affected_resources),
            "affected_resources": list(affected_resources),
            "severity_distribution": severity_counts,
            "impact_score": impact_score,
            "impact_level": "high" if impact_score > 0.7 else "medium" if impact_score > 0.4 else "low"
        }
    
    def _generate_recommendations(self, root_causes: List[Dict[str, Any]], 
                                impact_analysis: Dict[str, Any]) -> List[str]:
        """Generate actionable recommendations based on analysis"""
        
        recommendations = []
        
        # Recommendations based on root causes
        for root_cause in root_causes[:3]:  # Top 3 root causes
            recommendations.extend(root_cause.get("recommended_actions", []))
        
        # Impact-based recommendations
        if impact_analysis["impact_level"] == "high":
            recommendations.append("Consider implementing emergency response procedures")
            recommendations.append("Escalate to senior operations team")
        
        if len(impact_analysis["affected_resources"]) > 5:
            recommendations.append("Perform comprehensive health check on all affected resources")
        
        # Remove duplicates and limit
        unique_recommendations = list(dict.fromkeys(recommendations))
        return unique_recommendations[:10]
    
    def _calculate_analysis_confidence(self, correlations: List[Dict[str, Any]], 
                                     root_causes: List[Dict[str, Any]]) -> float:
        """Calculate overall confidence in the analysis"""
        
        if not correlations:
            return 0.3
        
        avg_correlation_confidence = sum(c["confidence"] for c in correlations) / len(correlations)
        
        if root_causes:
            avg_root_cause_confidence = sum(rc["confidence"] for rc in root_causes) / len(root_causes)
            return (avg_correlation_confidence + avg_root_cause_confidence) / 2
        
        return avg_correlation_confidence * 0.8  # Reduce if no strong root causes
    
    # Helper methods for data normalization and processing
    
    def _normalize_incidents_data(self, data: Any) -> List[Dict[str, Any]]:
        """Normalize incident data from various MCP tool formats"""
        if isinstance(data, dict):
            if "incidents" in data:
                return data["incidents"] if isinstance(data["incidents"], list) else [data["incidents"]]
            elif "incident" in data:
                return [data["incident"]]
            else:
                return [data]
        elif isinstance(data, list):
            return data
        return []
    
    def _normalize_logs_data(self, data: Any) -> List[Dict[str, Any]]:
        """Normalize log data from various MCP tool formats"""
        if isinstance(data, dict):
            if "logs" in data:
                return data["logs"] if isinstance(data["logs"], list) else [data["logs"]]
            else:
                return [data]
        elif isinstance(data, list):
            return data
        return []
    
    def _normalize_changelogs_data(self, data: Any) -> List[Dict[str, Any]]:
        """Normalize changelog data from various MCP tool formats"""
        if isinstance(data, dict):
            if "changelogs" in data:
                return data["changelogs"] if isinstance(data["changelogs"], list) else [data["changelogs"]]
            else:
                return [data]
        elif isinstance(data, list):
            return data
        return []
    
    def _normalize_resources_data(self, data: Any) -> List[Dict[str, Any]]:
        """Normalize resource data from various MCP tool formats"""
        if isinstance(data, dict):
            if "resources" in data:
                return data["resources"] if isinstance(data["resources"], list) else [data["resources"]]
            elif "resource" in data:
                return [data["resource"]]
            else:
                return [data]
        elif isinstance(data, list):
            return data
        return []
    
    def _parse_timestamp(self, timestamp_str: str) -> Optional[datetime]:
        """Parse timestamp string to datetime object"""
        if not timestamp_str:
            return None
        
        # Try different timestamp formats
        formats = [
            "%Y-%m-%dT%H:%M:%S.%fZ",
            "%Y-%m-%dT%H:%M:%SZ", 
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d %H:%M:%S"
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(timestamp_str, fmt)
            except ValueError:
                continue
        
        return None
    
    def _analyze_severity_distribution(self, incidents: List[Dict[str, Any]]) -> Dict[str, int]:
        """Analyze severity distribution of incidents"""
        distribution = {}
        for incident in incidents:
            severity = incident.get("severity", "unknown").lower()
            distribution[severity] = distribution.get(severity, 0) + 1
        return distribution
    
    def _calculate_correlation_confidence(self, incident: Dict[str, Any], 
                                        changes: List[Dict[str, Any]], 
                                        logs: List[Dict[str, Any]]) -> float:
        """Calculate confidence score for incident correlations"""
        base_confidence = 0.5
        
        # Boost based on number of correlated changes
        if changes:
            base_confidence += min(len(changes) * 0.15, 0.3)
        
        # Boost based on error logs
        error_logs = [log for log in logs if log.get("level", "").upper() in ["ERROR", "CRITICAL"]]
        if error_logs:
            base_confidence += min(len(error_logs) * 0.1, 0.2)
        
        return min(base_confidence, 1.0)
    
    def _get_time_before_incident(self, change: Dict[str, Any], incident: Dict[str, Any]) -> str:
        """Get human-readable time difference between change and incident"""
        change_time = self._parse_timestamp(change.get("timestamp", change.get("created_at")))
        incident_time = self._parse_timestamp(incident.get("created_at", incident.get("timestamp")))
        
        if not change_time or not incident_time:
            return "unknown time"
        
        diff = incident_time - change_time
        minutes = int(diff.total_seconds() / 60)
        
        if minutes < 60:
            return f"{minutes} minutes"
        else:
            hours = int(minutes / 60)
            return f"{hours} hours {minutes % 60} minutes"
    
    def _get_change_actions(self, change: Dict[str, Any]) -> List[str]:
        """Get recommended actions for change-related root causes"""
        actions = []
        
        change_type = change.get("type", "").lower()
        if "deployment" in change_type:
            actions.extend([
                "Review deployment logs for errors",
                "Consider rollback if deployment caused issues",
                "Check application health after deployment"
            ])
        elif "configuration" in change_type:
            actions.extend([
                "Review configuration changes",
                "Validate configuration against known good state"
            ])
        else:
            actions.append("Investigate the timing correlation between this change and the incident")
        
        return actions
    
    def _analyze_log_patterns(self, logs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze log entries for patterns"""
        patterns = []
        
        # Group by message content
        message_counts = {}
        for log in logs:
            message = log.get("_msg", log.get("message", "")).strip()
            if message:
                message_counts[message] = message_counts.get(message, 0) + 1
        
        # Identify significant patterns
        for message, count in message_counts.items():
            if count > 1:  # Pattern appears multiple times
                significance = min(count / 10, 1.0)  # Cap at 1.0
                patterns.append({
                    "pattern": message,
                    "count": count,
                    "significance": significance,
                    "first_occurrence": logs[0].get("timestamp", "unknown")
                })
        
        return patterns
    
    def _get_log_pattern_actions(self, pattern: Dict[str, Any]) -> List[str]:
        """Get recommended actions for log pattern root causes"""
        return [
            f"Investigate recurring pattern: {pattern['pattern']}",
            "Check application logs for related errors",
            "Review system resource utilization"
        ]
    
    def _calculate_impact_score(self, severity_counts: Dict[str, int], resource_count: int) -> float:
        """Calculate impact score based on severity and scope"""
        score = 0.0
        
        # Score based on severity
        severity_weights = {"critical": 1.0, "high": 0.8, "medium": 0.5, "low": 0.2}
        for severity, count in severity_counts.items():
            weight = severity_weights.get(severity, 0.3)
            score += count * weight
        
        # Score based on resource count
        resource_score = min(resource_count / 10, 1.0)
        
        return min((score + resource_score) / 2, 1.0)