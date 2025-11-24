"""
Pydantic models for LLM client structured outputs
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator
from .llm_enums import QueryType, RouteType, ExecutionType


class QueryAnalysisResult(BaseModel):
    """Result of query intent analysis"""
    query_type: QueryType
    intent: str
    entities: List[str] = Field(default_factory=list)
    confidence_score: float = Field(ge=0.0, le=1.0)
    is_multi_part: bool = False
    requires_memory: bool = False
    requires_tools: bool = False
    is_ambiguous: bool = False
    clarification_question: Optional[str] = None
    missing_info: List[str] = Field(default_factory=list)
    sub_queries: List[str] = Field(default_factory=list)
    specificity_level: Optional[str] = None
    investigation_strategy: Optional[str] = None

    @field_validator('confidence_score')
    @classmethod
    def validate_confidence(cls, v):
        """Ensure confidence is between 0 and 1"""
        if not 0.0 <= v <= 1.0:
            raise ValueError('Confidence score must be between 0.0 and 1.0')
        return v


class ToolPlanItem(BaseModel):
    """Individual tool in an execution plan"""
    name: str
    parameters: Dict[str, Any] = Field(default_factory=dict)


class SubQueryPlan(BaseModel):
    """Plan for a single sub-query in a multi-part query"""
    query: str
    tools: List[ToolPlanItem]
    priority: int = 1
    depends_on: List[str] = Field(default_factory=list)


class MultiQueryPlan(BaseModel):
    """Execution plan for multi-part queries"""
    execution_type: ExecutionType
    query_plan: Dict[str, SubQueryPlan]
    estimated_execution_time: Optional[str] = None
    parallelization_opportunities: List[str] = Field(default_factory=list)


class RootCause(BaseModel):
    """A potential root cause with evidence"""
    cause: str
    evidence: List[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)


class Correlation(BaseModel):
    """Correlation between data points"""
    description: str
    data_points: List[str] = Field(default_factory=list)
    strength: float = Field(ge=0.0, le=1.0, default=0.5)


class TimelineEvent(BaseModel):
    """Event in a timeline"""
    timestamp: Optional[str] = None
    event: str
    source: Optional[str] = None


class IncidentAnalysisResult(BaseModel):
    """Result of incident data analysis"""
    root_causes: List[RootCause] = Field(default_factory=list)
    correlations: List[Correlation] = Field(default_factory=list)
    timeline: List[TimelineEvent] = Field(default_factory=list)
    affected_resources: List[str] = Field(default_factory=list)
    confidence_score: float = Field(ge=0.0, le=1.0)
    recommendations: List[str] = Field(default_factory=list)


class EnrichedResponseResult(BaseModel):
    """Final enriched response to user"""
    final_response: str
    response: Optional[str] = None  # Alias for backward compatibility
    forward_links: List[str] = Field(default_factory=list)
    annotations: List[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)
    temporal_analysis: Optional[str] = None

    @field_validator('annotations', mode='before')
    @classmethod
    def validate_annotations(cls, v):
        """Convert string annotations to list if needed (LLM sometimes returns string)"""
        if isinstance(v, str):
            return [v] if v else []
        return v

    def model_post_init(self, __context):
        """Handle backward compatibility for 'response' field"""
        if self.response and not self.final_response:
            self.final_response = self.response
