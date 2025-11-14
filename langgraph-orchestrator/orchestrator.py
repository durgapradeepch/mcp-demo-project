"""
Simplified Orchestrator Agent - Validation and Initialization Only
The actual workflow execution happens in the LangGraph StateGraph nodes in enhanced_workflow.py
"""

import logging
from typing import Dict, Any
from datetime import datetime
from state import ChatState, update_state_context

logger = logging.getLogger(__name__)

class OrchestratorAgent:
    """
    Orchestrator agent responsible for initial validation and setup.
    Does NOT simulate or execute the workflow - that's handled by the LangGraph.
    """
    
    def __init__(self):
        self.name = "OrchestratorAgent"
        self.version = "2.0.0"  # Updated to reflect simplified architecture
        
        # Quality thresholds for validation
        self.quality_thresholds = {
            "minimum_confidence": 0.6,
            "minimum_query_length": 3,
            "maximum_query_length": 1000
        }
    
    async def orchestrate_workflow(self, state: ChatState) -> ChatState:
        """
        Orchestrator validation and initialization - NO workflow simulation.
        The actual workflow execution happens in the LangGraph StateGraph nodes.
        """
        session_id = state["session_id"]
        
        try:
            logger.info(f"🎯 Orchestrator validating workflow for session {session_id}")
            
            # Pre-execution validation
            validation_result = await self._validate_initial_state(state)
            
            logger.info(f"🔍 State validation: {'✅ PASSED' if validation_result['valid'] else '❌ FAILED'}")
            
            if not validation_result["valid"]:
                return self._handle_validation_failure(state, validation_result)
            
            # Update state with orchestrator metadata (no simulation)
            state = update_state_context(state, "orchestrator_validation", {
                "validated_at": datetime.now().isoformat(),
                "validation_result": validation_result,
                "orchestrator_version": self.version
            })
            state = {**state, "workflow_status": "running", "current_agent": "orchestrator"}
            
            logger.info("✅ Orchestrator validation passed. Control returned to workflow graph.")
            return state
            
        except Exception as e:
            logger.error(f"❌ Orchestrator validation error for session {session_id}: {str(e)}")
            return self._handle_workflow_failure(state, e)
    
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
        
        # Validate user query
        user_query = state.get("user_query", "")
        if len(user_query) < self.quality_thresholds["minimum_query_length"]:
            validation_results["errors"].append(
                f"Query too short (minimum {self.quality_thresholds['minimum_query_length']} characters)"
            )
            validation_results["valid"] = False
        
        if len(user_query) > self.quality_thresholds["maximum_query_length"]:
            validation_results["warnings"].append(
                f"Query very long ({len(user_query)} characters) - may impact processing time"
            )
        
        # Check that essential state structures exist
        if not isinstance(state.get("mcp_results"), list):
            validation_results["warnings"].append("mcp_results should be a list")
        
        if not isinstance(state.get("context_data"), dict):
            validation_results["warnings"].append("context_data should be a dict")
        
        # Emit warnings if present
        if validation_results["warnings"]:
            for warning in validation_results["warnings"]:
                logger.warning(f"⚠️ {warning}")
        
        return validation_results
    
    def _handle_validation_failure(self, state: ChatState, validation_result: Dict[str, Any]) -> ChatState:
        """Handle initial state validation failure"""
        logger.error(f"❌ State validation failed: {validation_result['errors']}")
        
        return {
            **state,
            "workflow_status": "failed",
            "error_count": len(validation_result["errors"]),
            "final_response": f"Request validation failed: {', '.join(validation_result['errors'])}"
        }
    
    def _handle_workflow_failure(self, state: ChatState, error: Exception) -> ChatState:
        """Handle unexpected workflow failure"""
        return {
            **state,
            "workflow_status": "failed",
            "error_count": state.get("error_count", 0) + 1,
            "final_response": f"Workflow failed: {str(error)}"
        }
