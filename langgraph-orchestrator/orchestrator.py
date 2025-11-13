"""
Main Orchestrator Agent - Governs the entire LangGraph workflow
This is the central coordinator that ensures everything runs smoothly
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime
import asyncio
from state import ChatState, calculate_state_health, update_state_context

logger = logging.getLogger(__name__)

class OrchestratorAgent:
    """
    Main orchestrator that governs all other agents and workflow execution.
    Ensures smooth operation, error handling, and quality control.
    """
    
    def __init__(self):
        self.name = "OrchestratorAgent"
        self.version = "1.0.0"
        self.active_sessions = {}
        self.performance_metrics = {
            "total_requests": 0,
            "successful_completions": 0,
            "average_response_time": 0.0,
            "error_rate": 0.0
        }
        
        # Quality thresholds
        self.quality_thresholds = {
            "minimum_confidence": 0.6,
            "minimum_success_rate": 0.8,
            "maximum_error_count": 3,
            "maximum_execution_time": 300  # 5 minutes
        }
    
    async def orchestrate_workflow(self, state: ChatState) -> ChatState:
        """
        Main orchestration method that governs the entire workflow
        """
        start_time = datetime.now()
        session_id = state["session_id"]
        
        try:
            logger.info(f"🎯 Orchestrator starting workflow for session {session_id}")
            
            # Register active session
            self.active_sessions[session_id] = {
                "start_time": start_time,
                "status": "running",
                "current_stage": "initialization"
            }
            
            # Update state with orchestrator control
            state = update_state_context(state, "orchestrator_session", session_id)
            state = {**state, "workflow_status": "running", "current_agent": "orchestrator"}
            
            # Pre-execution validation
            validation_result = await self._validate_initial_state(state)
            if not validation_result["valid"]:
                return self._handle_validation_failure(state, validation_result)
            
            # Monitor workflow execution
            final_state = await self._monitor_workflow_execution(state)
            
            # Post-execution quality check
            quality_check = await self._perform_quality_check(final_state)
            final_state = self._apply_quality_results(final_state, quality_check)
            
            # Update performance metrics
            self._update_performance_metrics(start_time, True)
            
            logger.info(f"✅ Orchestrator completed workflow for session {session_id}")
            return final_state
            
        except Exception as e:
            logger.error(f"❌ Orchestrator error for session {session_id}: {str(e)}")
            self._update_performance_metrics(start_time, False)
            return self._handle_workflow_failure(state, e)
        
        finally:
            # Clean up session
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
    
    async def _validate_initial_state(self, state: ChatState) -> Dict[str, Any]:
        """Validate that the initial state is ready for processing"""
        
        validation_results = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        # Check required fields
        required_fields = ["user_query", "session_id", "request_id"]
        for field in required_fields:
            if not state.get(field):
                validation_results["errors"].append(f"Missing required field: {field}")
                validation_results["valid"] = False
        
        # Check query quality
        if len(state["user_query"].strip()) < 3:
            validation_results["errors"].append("User query too short")
            validation_results["valid"] = False
        
        # Check for potential issues
        if "error" in state["user_query"].lower() and len(state["user_query"]) < 20:
            validation_results["warnings"].append("Vague error query detected - will use investigative approach")
        
        logger.info(f"🔍 State validation: {'✅ PASSED' if validation_results['valid'] else '❌ FAILED'}")
        
        return validation_results
    
    async def _monitor_workflow_execution(self, state: ChatState) -> ChatState:
        """
        Monitor and govern the execution of the workflow through all stages
        """
        session_id = state["session_id"]
        
        # Define the workflow stages
        workflow_stages = [
            ("query_analysis", "QueryAnalysisAgent"),
            ("tool_planning", "ToolPlanningAgent"), 
            ("tool_execution", "ToolExecutionAgent"),
            ("specialized_analysis", "AnalysisAgent"),
            ("response_enrichment", "ResponseEnrichmentAgent")
        ]
        
        current_state = state
        
        for stage_name, agent_name in workflow_stages:
            try:
                logger.info(f"🔄 Stage: {stage_name} with {agent_name}")
                
                # Update session tracking
                self.active_sessions[session_id]["current_stage"] = stage_name
                current_state = {**current_state, "current_agent": agent_name}
                
                # Execute stage with monitoring
                stage_result = await self._execute_monitored_stage(
                    current_state, stage_name, agent_name
                )
                
                # Health check after each stage
                health = calculate_state_health(stage_result)
                
                if health["overall_health"] == "degraded":
                    logger.warning(f"⚠️ Degraded health after {stage_name}: {health}")
                    
                    # Decide whether to continue or abort
                    if health["success_rate"] < 50:
                        logger.error(f"❌ Aborting workflow due to poor health")
                        break
                
                current_state = stage_result
                
            except Exception as e:
                logger.error(f"❌ Stage {stage_name} failed: {str(e)}")
                current_state = self._handle_stage_failure(current_state, stage_name, e)
                
                # Decide whether to continue
                if current_state["error_count"] >= self.quality_thresholds["maximum_error_count"]:
                    logger.error(f"❌ Maximum error count reached, aborting workflow")
                    break
        
        return current_state
    
    async def _execute_monitored_stage(self, state: ChatState, stage_name: str, 
                                     agent_name: str) -> ChatState:
        """Execute a workflow stage with timeout and monitoring"""
        
        timeout = 60  # 60 seconds per stage
        
        try:
            # This would call the actual agent - for now, we'll simulate
            stage_result = await asyncio.wait_for(
                self._simulate_stage_execution(state, stage_name),
                timeout=timeout
            )
            
            logger.info(f"✅ Stage {stage_name} completed successfully")
            return stage_result
            
        except asyncio.TimeoutError:
            logger.error(f"⏰ Stage {stage_name} timed out after {timeout}s")
            raise
        except Exception as e:
            logger.error(f"❌ Stage {stage_name} execution failed: {str(e)}")
            raise
    
    async def _simulate_stage_execution(self, state: ChatState, stage_name: str) -> ChatState:
        """
        Simulate stage execution - replace with actual agent calls
        """
        # Simulate processing time
        await asyncio.sleep(0.1)
        
        # Update state based on stage
        if stage_name == "query_analysis":
            return {
                **state,
                "query_type": "incident_analysis" if "error" in state["user_query"].lower() else "exploration",
                "intent": "investigate",
                "confidence_score": 0.8,
                "specificity_level": "medium"
            }
        
        elif stage_name == "tool_planning":
            tools = ["search_logs", "get_incidents", "search_changelogs"] if state["query_type"] == "incident_analysis" else ["get_schema", "get_node_labels"]
            return {
                **state,
                "tool_sequence": tools
            }
        
        elif stage_name == "tool_execution":
            # Simulate tool results
            mock_results = [
                {
                    "tool_name": tool,
                    "result": {"status": "success", "data": f"mock_data_for_{tool}"},
                    "agent": "ToolExecutionAgent",
                    "timestamp": datetime.now().isoformat(),
                    "success": True
                }
                for tool in state["tool_sequence"]
            ]
            return {
                **state,
                "mcp_results": mock_results,
                "executed_tools": state["tool_sequence"].copy()
            }
        
        elif stage_name == "specialized_analysis":
            if state["query_type"] == "incident_analysis":
                return {
                    **state,
                    "incident_analysis": {
                        "root_causes": ["Database connection timeout"],
                        "timeline": [],
                        "confidence": 0.9
                    }
                }
            return state
        
        elif stage_name == "response_enrichment":
            return {
                **state,
                "enrichment_data": {"forward_links": ["Check database health", "Review recent deployments"]},
                "final_response": f"Analysis completed for: {state['user_query']}"
            }
        
        return state
    
    async def _perform_quality_check(self, state: ChatState) -> Dict[str, Any]:
        """Perform comprehensive quality check on the final state"""
        
        quality_metrics = {
            "response_completeness": 0.0,
            "data_quality": 0.0,
            "confidence_level": 0.0,
            "recommendation": "approved"
        }
        
        # Check response completeness
        if state["final_response"]:
            quality_metrics["response_completeness"] = 1.0
        
        # Check data quality based on successful tool executions
        successful_tools = sum(1 for result in state["mcp_results"] if result["success"])
        total_tools = len(state["mcp_results"])
        
        if total_tools > 0:
            quality_metrics["data_quality"] = successful_tools / total_tools
        
        # Overall confidence
        quality_metrics["confidence_level"] = state.get("confidence_score", 0.0)
        
        # Make recommendation
        if (quality_metrics["response_completeness"] < 0.8 or 
            quality_metrics["data_quality"] < 0.6 or
            quality_metrics["confidence_level"] < 0.5):
            quality_metrics["recommendation"] = "needs_improvement"
        
        logger.info(f"📊 Quality check: {quality_metrics}")
        
        return quality_metrics
    
    def _apply_quality_results(self, state: ChatState, quality_check: Dict[str, Any]) -> ChatState:
        """Apply quality check results to the final state"""
        
        # Update state with quality metrics
        updated_state = {
            **state,
            "data_quality_score": quality_check["data_quality"],
            "response_completeness": quality_check["response_completeness"],
            "workflow_status": "completed"
        }
        
        # Add quality annotations if needed
        if quality_check["recommendation"] == "needs_improvement":
            annotations = state.get("annotations", []).copy()
            annotations.append("⚠️ Response quality below optimal thresholds")
            updated_state["annotations"] = annotations
        
        return updated_state
    
    def _handle_workflow_failure(self, state: ChatState, error: Exception) -> ChatState:
        """Handle complete workflow failure"""
        
        return {
            **state,
            "workflow_status": "failed",
            "final_response": "I encountered an error while processing your request. Please try again.",
            "error_count": state.get("error_count", 0) + 1
        }
    
    def _handle_stage_failure(self, state: ChatState, stage_name: str, error: Exception) -> ChatState:
        """Handle failure in a specific stage"""
        
        error_count = state.get("error_count", 0) + 1
        
        return {
            **state,
            "error_count": error_count,
            "workflow_status": "degraded" if error_count < 3 else "failed"
        }
    
    def _handle_validation_failure(self, state: ChatState, validation_result: Dict[str, Any]) -> ChatState:
        """Handle initial validation failure"""
        
        error_message = "Invalid request: " + "; ".join(validation_result["errors"])
        
        return {
            **state,
            "workflow_status": "failed",
            "final_response": error_message
        }
    
    def _update_performance_metrics(self, start_time: datetime, success: bool):
        """Update orchestrator performance metrics"""
        
        duration = (datetime.now() - start_time).total_seconds()
        
        self.performance_metrics["total_requests"] += 1
        
        if success:
            self.performance_metrics["successful_completions"] += 1
        
        # Update average response time
        total_requests = self.performance_metrics["total_requests"]
        current_avg = self.performance_metrics["average_response_time"]
        self.performance_metrics["average_response_time"] = (
            (current_avg * (total_requests - 1) + duration) / total_requests
        )
        
        # Update error rate
        errors = total_requests - self.performance_metrics["successful_completions"]
        self.performance_metrics["error_rate"] = errors / total_requests
    
    def get_orchestrator_status(self) -> Dict[str, Any]:
        """Get current orchestrator status and metrics"""
        
        return {
            "name": self.name,
            "version": self.version,
            "active_sessions": len(self.active_sessions),
            "performance_metrics": self.performance_metrics,
            "health": "healthy" if self.performance_metrics["error_rate"] < 0.1 else "degraded"
        }