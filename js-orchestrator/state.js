/**
 * State Management for JavaScript LangGraph Orchestrator
 * Defines the state structure that flows through the entire workflow
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * @typedef {Object} MCPResult
 * @property {string} tool_name - Name of the executed tool
 * @property {Object} result - Result data from the tool
 * @property {string} agent - Agent that executed the tool
 * @property {string} timestamp - ISO timestamp of execution
 * @property {boolean} success - Whether the execution was successful
 */

/**
 * @typedef {Object} ChatState
 * @property {string} session_id - Unique session identifier
 * @property {string} request_id - Unique request identifier
 * @property {string} user_query - Original user query
 * @property {string} timestamp - ISO timestamp of request
 * 
 * @property {string} query_type - Type of query: "incident_analysis", "exploration", "general", "root_cause"
 * @property {string} intent - Analyzed intent of the query
 * @property {string[]} entities - Extracted entities from query
 * @property {number} confidence_score - Confidence score (0.0-1.0)
 * @property {string} specificity_level - "high", "medium", "low"
 * 
 * @property {string[]} tool_sequence - Planned sequence of tools to execute
 * @property {string[]} executed_tools - Tools that have been executed
 * @property {number} current_tool_index - Current position in tool sequence
 * 
 * @property {MCPResult[]} mcp_results - Results from MCP tool executions
 * @property {Object} context_data - Additional context data
 * @property {Object[]} correlations - Data correlations found
 * 
 * @property {Object|null} incident_analysis - Specialized incident analysis results
 * @property {Object|null} root_cause_analysis - Root cause analysis results
 * @property {Object[]|null} timeline_data - Timeline of events
 * 
 * @property {Object} enrichment_data - Response enrichment data
 * @property {string[]} forward_links - Suggested next actions
 * @property {string[]} annotations - Important notes or warnings
 * @property {string} final_response - Final response to user
 * 
 * @property {string} workflow_status - "running", "completed", "failed", "paused"
 * @property {string} current_agent - Currently active agent
 * @property {number} error_count - Number of errors encountered
 * @property {number} retry_attempts - Number of retry attempts
 * 
 * @property {number} data_quality_score - Quality score of collected data
 * @property {number} response_completeness - Completeness score of response
 * @property {number} investigation_depth - Depth of investigation performed
 */

/**
 * Create initial state for a new chat request
 * @param {string} userQuery - User's query
 * @param {string} [sessionId] - Optional session ID
 * @returns {ChatState} Initial state object
 */
export function createInitialState(userQuery, sessionId = null) {
    if (!sessionId) {
        sessionId = uuidv4();
    }

    return {
        // Core request data
        session_id: sessionId,
        request_id: uuidv4(),
        user_query: userQuery,
        timestamp: new Date().toISOString(),

        // Query analysis results
        query_type: "",
        intent: "",
        entities: [],
        confidence_score: 0.0,
        specificity_level: "unknown",

        // Tool execution planning
        tool_sequence: [],
        executed_tools: [],
        current_tool_index: 0,

        // Data accumulation
        mcp_results: [],
        context_data: {},
        correlations: [],

        // Specialized analysis results
        incident_analysis: null,
        root_cause_analysis: null,
        timeline_data: null,

        // Response construction
        enrichment_data: {},
        forward_links: [],
        annotations: [],
        final_response: "",

        // Orchestration metadata
        workflow_status: "initialized",
        current_agent: "orchestrator",
        error_count: 0,
        retry_attempts: 0,

        // Quality and confidence tracking
        data_quality_score: 0.0,
        response_completeness: 0.0,
        investigation_depth: 0
    };
}

/**
 * Helper to safely update context data
 * @param {ChatState} state - Current state
 * @param {string} key - Context key
 * @param {any} value - Context value
 * @returns {ChatState} Updated state
 */
export function updateStateContext(state, key, value) {
    return {
        ...state,
        context_data: {
            ...state.context_data,
            [key]: value
        }
    };
}

/**
 * Add a new MCP tool execution result to the state
 * @param {ChatState} state - Current state
 * @param {string} toolName - Name of executed tool
 * @param {Object} result - Tool execution result
 * @param {string} [agent="unknown"] - Agent that executed the tool
 * @returns {ChatState} Updated state
 */
export function addMCPResult(state, toolName, result, agent = "unknown") {
    const newResult = {
        tool_name: toolName,
        result: result,
        agent: agent,
        timestamp: new Date().toISOString(),
        success: !("error" in result)
    };

    const newResults = [...state.mcp_results, newResult];
    
    const executedTools = [...state.executed_tools];
    if (!executedTools.includes(toolName)) {
        executedTools.push(toolName);
    }

    return {
        ...state,
        mcp_results: newResults,
        executed_tools: executedTools
    };
}

/**
 * Calculate overall health and progress metrics for the state
 * @param {ChatState} state - Current state
 * @returns {Object} Health metrics
 */
export function calculateStateHealth(state) {
    const totalToolsPlanned = state.tool_sequence.length;
    const toolsExecuted = state.executed_tools.length;
    const successfulExecutions = state.mcp_results.filter(result => result.success).length;

    const progressPercentage = totalToolsPlanned > 0 ? (toolsExecuted / totalToolsPlanned * 100) : 0;
    const successRate = toolsExecuted > 0 ? (successfulExecutions / toolsExecuted * 100) : 0;

    return {
        progress_percentage: progressPercentage,
        success_rate: successRate,
        tools_remaining: totalToolsPlanned - toolsExecuted,
        error_rate: toolsExecuted > 0 ? (state.error_count / toolsExecuted) : 0,
        overall_health: successRate > 80 && state.error_count < 3 ? "healthy" : "degraded"
    };
}

/**
 * Deep clone a state object to prevent mutations
 * @param {ChatState} state - State to clone
 * @returns {ChatState} Cloned state
 */
export function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
}

/**
 * Validate state structure and required fields
 * @param {ChatState} state - State to validate
 * @returns {Object} Validation result
 */
export function validateState(state) {
    const requiredFields = ['session_id', 'request_id', 'user_query', 'timestamp'];
    const errors = [];
    const warnings = [];

    // Check required fields
    for (const field of requiredFields) {
        if (!state[field]) {
            errors.push(`Missing required field: ${field}`);
        }
    }

    // Check query quality
    if (state.user_query && state.user_query.trim().length < 3) {
        errors.push("User query too short");
    }

    // Check for potential issues
    if (state.error_count > 5) {
        warnings.push("High error count detected");
    }

    if (state.mcp_results.length === 0 && state.workflow_status !== "initialized") {
        warnings.push("No MCP results found in active workflow");
    }

    return {
        valid: errors.length === 0,
        errors: errors,
        warnings: warnings
    };
}

/**
 * Get a summary of the current state for logging/debugging
 * @param {ChatState} state - Current state
 * @returns {Object} State summary
 */
export function getStateSummary(state) {
    return {
        session_id: state.session_id,
        query_type: state.query_type,
        workflow_status: state.workflow_status,
        current_agent: state.current_agent,
        tools_planned: state.tool_sequence.length,
        tools_executed: state.executed_tools.length,
        error_count: state.error_count,
        confidence_score: state.confidence_score,
        investigation_depth: state.investigation_depth
    };
}

/**
 * Merge multiple states (useful for parallel execution)
 * @param {ChatState} primaryState - Primary state to merge into
 * @param {...ChatState} otherStates - Other states to merge
 * @returns {ChatState} Merged state
 */
export function mergeStates(primaryState, ...otherStates) {
    let merged = cloneState(primaryState);

    for (const otherState of otherStates) {
        // Merge MCP results
        merged.mcp_results = [...merged.mcp_results, ...otherState.mcp_results];
        
        // Merge executed tools (unique values)
        merged.executed_tools = [...new Set([...merged.executed_tools, ...otherState.executed_tools])];
        
        // Merge context data
        merged.context_data = { ...merged.context_data, ...otherState.context_data };
        
        // Merge correlations
        merged.correlations = [...merged.correlations, ...otherState.correlations];
        
        // Take the highest error count
        merged.error_count = Math.max(merged.error_count, otherState.error_count);
        
        // Take the highest investigation depth
        merged.investigation_depth = Math.max(merged.investigation_depth, otherState.investigation_depth);
    }

    return merged;
}

/**
 * Export all state management functions as a module
 */
export default {
    createInitialState,
    updateStateContext,
    addMCPResult,
    calculateStateHealth,
    cloneState,
    validateState,
    getStateSummary,
    mergeStates
};