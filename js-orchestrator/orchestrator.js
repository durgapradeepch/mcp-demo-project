/**
 * Main Orchestrator Agent - Governs the entire workflow
 * This is the central coordinator that ensures everything runs smoothly
 */

import winston from 'winston';
import { calculateStateHealth, updateStateContext } from './state.js';

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} - ${level}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

/**
 * Main orchestrator that governs all other agents and workflow execution.
 * Ensures smooth operation, error handling, and quality control.
 */
class OrchestratorAgent {
    constructor() {
        this.name = 'OrchestratorAgent';
        this.version = '1.0.0';
        this.activeSessions = new Map();
        this.performanceMetrics = {
            total_requests: 0,
            successful_completions: 0,
            average_response_time: 0.0,
            error_rate: 0.0
        };
        
        // Quality thresholds
        this.qualityThresholds = {
            minimum_confidence: 0.6,
            minimum_success_rate: 0.8,
            maximum_error_count: 3,
            maximum_execution_time: 300000  // 5 minutes in milliseconds
        };
    }

    /**
     * Main orchestration method that governs the entire workflow
     * @param {Object} state - Current chat state
     * @returns {Promise<Object>} Updated state
     */
    async orchestrateWorkflow(state) {
        const startTime = Date.now();
        const sessionId = state.session_id;
        
        try {
            logger.info(`🎯 Orchestrator starting workflow for session ${sessionId}`);
            
            // Register active session
            this.activeSessions.set(sessionId, {
                start_time: startTime,
                status: 'running',
                current_stage: 'initialization'
            });
            
            // Update state with orchestrator control
            let updatedState = updateStateContext(state, 'orchestrator_session', sessionId);
            updatedState = {
                ...updatedState,
                workflow_status: 'running',
                current_agent: 'orchestrator'
            };
            
            // Pre-execution validation
            const validationResult = await this._validateInitialState(updatedState);
            if (!validationResult.valid) {
                return this._handleValidationFailure(updatedState, validationResult);
            }
            
            // Monitor workflow execution
            const finalState = await this._monitorWorkflowExecution(updatedState);
            
            // Post-execution quality check
            const qualityCheck = await this._performQualityCheck(finalState);
            const completedState = this._applyQualityResults(finalState, qualityCheck);
            
            // Update performance metrics
            this._updatePerformanceMetrics(startTime, true);
            
            logger.info(`✅ Orchestrator completed workflow for session ${sessionId}`);
            return completedState;
            
        } catch (error) {
            logger.error(`❌ Orchestrator error for session ${sessionId}: ${error.message}`);
            this._updatePerformanceMetrics(startTime, false);
            return this._handleWorkflowFailure(state, error);
        } finally {
            // Clean up session
            if (this.activeSessions.has(sessionId)) {
                this.activeSessions.delete(sessionId);
            }
        }
    }

    /**
     * Validate that the initial state is ready for processing
     * @param {Object} state - Initial state to validate
     * @returns {Promise<Object>} Validation results
     */
    async _validateInitialState(state) {
        const validationResults = {
            valid: true,
            errors: [],
            warnings: []
        };
        
        // Check required fields
        const requiredFields = ['user_query', 'session_id', 'request_id'];
        for (const field of requiredFields) {
            if (!state[field]) {
                validationResults.errors.push(`Missing required field: ${field}`);
                validationResults.valid = false;
            }
        }
        
        // Check query quality
        if (state.user_query && state.user_query.trim().length < 3) {
            validationResults.errors.push('User query too short');
            validationResults.valid = false;
        }
        
        // Check for potential issues
        if (state.user_query && state.user_query.toLowerCase().includes('error') && state.user_query.length < 20) {
            validationResults.warnings.push('Vague error query detected - will use investigative approach');
        }
        
        logger.info(`🔍 State validation: ${validationResults.valid ? '✅ PASSED' : '❌ FAILED'}`);
        
        return validationResults;
    }

    /**
     * Monitor and govern the execution of the workflow through all stages
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Updated state after all stages
     */
    async _monitorWorkflowExecution(state) {
        const sessionId = state.session_id;
        
        // Define the workflow stages
        const workflowStages = [
            ['query_analysis', 'QueryAnalysisAgent'],
            ['tool_planning', 'ToolPlanningAgent'],
            ['tool_execution', 'ToolExecutionAgent'],
            ['specialized_analysis', 'AnalysisAgent'],
            ['response_enrichment', 'ResponseEnrichmentAgent']
        ];
        
        let currentState = state;
        
        for (const [stageName, agentName] of workflowStages) {
            try {
                logger.info(`🔄 Stage: ${stageName} with ${agentName}`);
                
                // Update session tracking
                if (this.activeSessions.has(sessionId)) {
                    const sessionInfo = this.activeSessions.get(sessionId);
                    sessionInfo.current_stage = stageName;
                    this.activeSessions.set(sessionId, sessionInfo);
                }
                
                currentState = {
                    ...currentState,
                    current_agent: agentName
                };
                
                // Execute stage with monitoring
                const stageResult = await this._executeMonitoredStage(
                    currentState,
                    stageName,
                    agentName
                );
                
                // Health check after each stage
                const health = calculateStateHealth(stageResult);
                
                if (health.overall_health === 'degraded') {
                    logger.warn(`⚠️ Degraded health after ${stageName}: ${JSON.stringify(health)}`);
                    
                    // Decide whether to continue or abort
                    if (health.success_rate < 50) {
                        logger.error(`❌ Aborting workflow due to poor health`);
                        break;
                    }
                }
                
                currentState = stageResult;
                
            } catch (error) {
                logger.error(`❌ Stage ${stageName} failed: ${error.message}`);
                currentState = this._handleStageFailure(currentState, stageName, error);
                
                // Decide whether to continue
                if (currentState.error_count >= this.qualityThresholds.maximum_error_count) {
                    logger.error(`❌ Maximum error count reached, aborting workflow`);
                    break;
                }
            }
        }
        
        return currentState;
    }

    /**
     * Execute a workflow stage with timeout and monitoring
     * @param {Object} state - Current state
     * @param {string} stageName - Name of the stage
     * @param {string} agentName - Name of the agent
     * @returns {Promise<Object>} Updated state
     */
    async _executeMonitoredStage(state, stageName, agentName) {
        const timeout = 60000; // 60 seconds per stage
        
        try {
            // This would call the actual agent - for now, we'll simulate
            const stageResult = await Promise.race([
                this._simulateStageExecution(state, stageName),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`Stage timeout: ${stageName}`)), timeout)
                )
            ]);
            
            logger.info(`✅ Stage ${stageName} completed successfully`);
            return stageResult;
            
        } catch (error) {
            if (error.message.includes('timeout')) {
                logger.error(`⏰ Stage ${stageName} timed out after ${timeout}ms`);
            } else {
                logger.error(`❌ Stage ${stageName} execution failed: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Simulate stage execution - replace with actual agent calls
     * @param {Object} state - Current state
     * @param {string} stageName - Stage to simulate
     * @returns {Promise<Object>} Simulated result
     */
    async _simulateStageExecution(state, stageName) {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Update state based on stage
        switch (stageName) {
            case 'query_analysis':
                return {
                    ...state,
                    query_type: state.user_query.toLowerCase().includes('error') ? 'incident_analysis' : 'exploration',
                    intent: 'investigate',
                    confidence_score: 0.8,
                    specificity_level: 'medium'
                };
                
            case 'tool_planning':
                const tools = state.query_type === 'incident_analysis' 
                    ? ['search_logs', 'get_incidents', 'search_changelogs']
                    : ['get_schema', 'get_node_labels'];
                return {
                    ...state,
                    tool_sequence: tools
                };
                
            case 'tool_execution':
                // Simulate tool results
                const mockResults = state.tool_sequence.map(tool => ({
                    tool_name: tool,
                    result: { status: 'success', data: `mock_data_for_${tool}` },
                    agent: 'ToolExecutionAgent',
                    timestamp: new Date().toISOString(),
                    success: true
                }));
                return {
                    ...state,
                    mcp_results: mockResults,
                    executed_tools: [...state.tool_sequence]
                };
                
            case 'specialized_analysis':
                if (state.query_type === 'incident_analysis') {
                    return {
                        ...state,
                        incident_analysis: {
                            root_causes: ['Database connection timeout'],
                            timeline: [],
                            confidence: 0.9
                        }
                    };
                }
                return state;
                
            case 'response_enrichment':
                return {
                    ...state,
                    enrichment_data: {
                        forward_links: ['Check database health', 'Review recent deployments']
                    },
                    final_response: `Analysis completed for: ${state.user_query}`
                };
                
            default:
                return state;
        }
    }

    /**
     * Perform comprehensive quality check on the final state
     * @param {Object} state - Final state to check
     * @returns {Promise<Object>} Quality metrics
     */
    async _performQualityCheck(state) {
        const qualityMetrics = {
            response_completeness: 0.0,
            data_quality: 0.0,
            confidence_level: 0.0,
            recommendation: 'approved'
        };
        
        // Check response completeness
        if (state.final_response) {
            qualityMetrics.response_completeness = 1.0;
        }
        
        // Check data quality based on successful tool executions
        const successfulTools = (state.mcp_results || []).filter(result => result.success).length;
        const totalTools = (state.mcp_results || []).length;
        
        if (totalTools > 0) {
            qualityMetrics.data_quality = successfulTools / totalTools;
        }
        
        // Overall confidence
        qualityMetrics.confidence_level = state.confidence_score || 0.0;
        
        // Make recommendation
        if (qualityMetrics.response_completeness < 0.8 ||
            qualityMetrics.data_quality < 0.6 ||
            qualityMetrics.confidence_level < 0.5) {
            qualityMetrics.recommendation = 'needs_improvement';
        }
        
        logger.info(`📊 Quality check: ${JSON.stringify(qualityMetrics)}`);
        
        return qualityMetrics;
    }

    /**
     * Apply quality check results to the final state
     * @param {Object} state - Current state
     * @param {Object} qualityCheck - Quality check results
     * @returns {Object} Updated state
     */
    _applyQualityResults(state, qualityCheck) {
        // Update state with quality metrics
        const updatedState = {
            ...state,
            data_quality_score: qualityCheck.data_quality,
            response_completeness: qualityCheck.response_completeness,
            workflow_status: 'completed'
        };
        
        // Add quality annotations if needed
        if (qualityCheck.recommendation === 'needs_improvement') {
            const annotations = [...(state.annotations || [])];
            annotations.push('⚠️ Response quality below optimal thresholds');
            updatedState.annotations = annotations;
        }
        
        return updatedState;
    }

    /**
     * Handle complete workflow failure
     * @param {Object} state - Current state
     * @param {Error} error - Error that caused failure
     * @returns {Object} Failure state
     */
    _handleWorkflowFailure(state, error) {
        return {
            ...state,
            workflow_status: 'failed',
            final_response: 'I encountered an error while processing your request. Please try again.',
            error_count: (state.error_count || 0) + 1,
            error_details: error.message
        };
    }

    /**
     * Handle failure in a specific stage
     * @param {Object} state - Current state
     * @param {string} stageName - Failed stage name
     * @param {Error} error - Error that occurred
     * @returns {Object} Updated state
     */
    _handleStageFailure(state, stageName, error) {
        const errorCount = (state.error_count || 0) + 1;
        
        return {
            ...state,
            error_count: errorCount,
            workflow_status: errorCount < 3 ? 'degraded' : 'failed',
            failed_stage: stageName,
            stage_error: error.message
        };
    }

    /**
     * Handle initial validation failure
     * @param {Object} state - Current state
     * @param {Object} validationResult - Validation results
     * @returns {Object} Failure state
     */
    _handleValidationFailure(state, validationResult) {
        const errorMessage = 'Invalid request: ' + validationResult.errors.join('; ');
        
        return {
            ...state,
            workflow_status: 'failed',
            final_response: errorMessage,
            validation_errors: validationResult.errors
        };
    }

    /**
     * Update orchestrator performance metrics
     * @param {number} startTime - Start timestamp
     * @param {boolean} success - Whether the operation succeeded
     */
    _updatePerformanceMetrics(startTime, success) {
        const duration = Date.now() - startTime;
        
        this.performanceMetrics.total_requests++;
        
        if (success) {
            this.performanceMetrics.successful_completions++;
        }
        
        // Update average response time
        const totalRequests = this.performanceMetrics.total_requests;
        const currentAvg = this.performanceMetrics.average_response_time;
        this.performanceMetrics.average_response_time = 
            (currentAvg * (totalRequests - 1) + duration) / totalRequests;
        
        // Update error rate
        const errors = totalRequests - this.performanceMetrics.successful_completions;
        this.performanceMetrics.error_rate = errors / totalRequests;
    }

    /**
     * Get current orchestrator status and metrics
     * @returns {Object} Status information
     */
    getOrchestratorStatus() {
        return {
            name: this.name,
            version: this.version,
            active_sessions: this.activeSessions.size,
            performance_metrics: { ...this.performanceMetrics },
            health: this.performanceMetrics.error_rate < 0.1 ? 'healthy' : 'degraded'
        };
    }

    /**
     * Get detailed session information
     * @param {string} sessionId - Session to get info for
     * @returns {Object|null} Session info or null if not found
     */
    getSessionInfo(sessionId) {
        return this.activeSessions.get(sessionId) || null;
    }

    /**
     * Get all active sessions
     * @returns {Array<Object>} Array of active session info
     */
    getAllActiveSessions() {
        return Array.from(this.activeSessions.entries()).map(([sessionId, info]) => ({
            session_id: sessionId,
            ...info
        }));
    }
}

export default OrchestratorAgent;