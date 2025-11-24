"""
Enums for LLM client to replace magic strings
"""

from enum import Enum


class QueryType(str, Enum):
    """Types of user queries"""
    CONVERSATIONAL = "conversational"
    INCIDENT_ANALYSIS = "incident_analysis"
    EXPLORATION = "exploration"
    ROOT_CAUSE = "root_cause"
    DATA_RETRIEVAL = "data_retrieval"
    GENERAL = "general"


class RouteType(str, Enum):
    """Workflow routing decisions"""
    INCIDENT_ANALYSIS = "incident_analysis"
    RESPONSE_ENRICHMENT = "response_enrichment"
    ERROR_RECOVERY = "error_recovery"
    CONTINUE_EXECUTION = "continue_execution"


class ExecutionType(str, Enum):
    """Execution strategies for multi-part queries"""
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    MIXED = "mixed"
    SINGLE = "single"
