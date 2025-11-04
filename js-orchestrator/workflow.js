/**
 * LangGraph Workflow - Main state machine for orchestrating the MCP chatbot workflow
 * JavaScript implementation using XState for state management
 */

import winston from 'winston';
import { createMachine, interpret, assign } from 'xstate';
import { createInitialState } from './state.js';
import OrchestratorAgent from './orchestrator.js';
import QueryAnalysisAgent from './agents/query_analysis_agent.js';
import ToolExecutionAgent from './agents/tool_execution_agent.js';
import IncidentAnalysisAgent from './agents/incident_analysis_agent.js';
import ResponseEnrichmentAgent from './agents/response_enrichment_agent.js';
import llmClient from './utils/llm_client.js';

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
 * Main LangGraph workflow that orchestrates the entire chat processing pipeline
 */
class LangGraphWorkflow {
    constructor(mcpClient) {
        this.mcpClient = mcpClient;
        
        // Initialize agents
        this.orchestrator = new OrchestratorAgent();
        this.queryAnalyzer = new QueryAnalysisAgent();
        this.toolExecutor = new ToolExecutionAgent(mcpClient);
        this.incidentAnalyzer = new IncidentAnalysisAgent();
        this.responseEnricher = new ResponseEnrichmentAgent();
        
        // Build the workflow state machine
        this.workflowMachine = this._buildWorkflowMachine();
        
        // Services for storing active workflow instances
        this.activeWorkflows = new Map();
    }

    /**
     * Build the XState workflow state machine
     * @returns {Object} XState machine definition
     */
    _buildWorkflowMachine() {
        return createMachine({
            id: 'langGraphWorkflow',
            initial: 'orchestrator_start',
            context: {
                chatState: null,
                sessionId: null,
                error: null
            },
            states: {
                orchestrator_start: {
                    entry: 'logStateEntry',
                    invoke: {
                        src: 'orchestratorStart',
                        onDone: {
                            target: 'query_analysis',
                            actions: assign({
                                chatState: (_, event) => event.data
                            })
                        },
                        onError: {
                            target: 'error_recovery',
                            actions: assign({
                                error: (_, event) => event.data
                            })
                        }
                    }
                },
                
                query_analysis: {
                    entry: 'logStateEntry',
                    invoke: {
                        src: 'queryAnalysis',
                        onDone: {
                            target: 'tool_planning',
                            actions: assign({
                                chatState: (_, event) => event.data
                            })
                        },
                        onError: {
                            target: 'error_recovery',
                            actions: assign({
                                error: (_, event) => event.data
                            })
                        }
                    }
                },
                
                tool_planning: {
                    entry: 'logStateEntry',
                    invoke: {
                        src: 'toolPlanning',
                        onDone: {
                            target: 'tool_execution',
                            actions: assign({
                                chatState: (_, event) => event.data
                            })
                        },
                        onError: {
                            target: 'error_recovery',
                            actions: assign({
                                error: (_, event) => event.data
                            })
                        }
                    }
                },
                
                tool_execution: {
                    entry: 'logStateEntry',
                    invoke: {
                        src: 'toolExecution',
                        onDone: {
                            target: 'routing_decision',
                            actions: assign({
                                chatState: (_, event) => event.data
                            })
                        },
                        onError: {
                            target: 'error_recovery',
                            actions: assign({
                                error: (_, event) => event.data
                            })
                        }
                    }
                },
                
                routing_decision: {
                    entry: 'logStateEntry',
                    invoke: {
                        src: 'routingDecision',
                        onDone: [
                            {
                                target: 'incident_analysis',
                                cond: (_, event) => event.data === 'incident_analysis'
                            },
                            {
                                target: 'response_enrichment',
                                cond: (_, event) => event.data === 'response_enrichment'
                            },
                            {
                                target: 'error_recovery',
                                cond: (_, event) => event.data === 'error_recovery'
                            }
                        ]
                    }
                },
                
                incident_analysis: {
                    entry: 'logStateEntry',
                    invoke: {
                        src: 'incidentAnalysis',
                        onDone: {
                            target: 'response_enrichment',
                            actions: assign({
                                chatState: (_, event) => event.data
                            })
                        },
                        onError: {
                            target: 'error_recovery',
                            actions: assign({
                                error: (_, event) => event.data
                            })
                        }
                    }
                },
                
                response_enrichment: {
                    entry: 'logStateEntry',
                    invoke: {
                        src: 'responseEnrichment',
                        onDone: {
                            target: 'orchestrator_finish',
                            actions: assign({
                                chatState: (_, event) => event.data
                            })
                        },
                        onError: {
                            target: 'error_recovery',
                            actions: assign({
                                error: (_, event) => event.data
                            })
                        }
                    }
                },
                
                orchestrator_finish: {
                    entry: 'logStateEntry',
                    invoke: {
                        src: 'orchestratorFinish',
                        onDone: {
                            target: 'completed',
                            actions: assign({
                                chatState: (_, event) => event.data
                            })
                        },
                        onError: {
                            target: 'error_recovery',
                            actions: assign({
                                error: (_, event) => event.data
                            })
                        }
                    }
                },
                
                error_recovery: {
                    entry: 'logStateEntry',
                    invoke: {
                        src: 'errorRecovery',
                        onDone: {
                            target: 'completed',
                            actions: assign({
                                chatState: (_, event) => event.data
                            })
                        }
                    }
                },
                
                completed: {
                    type: 'final',
                    entry: 'logStateEntry'
                }
            }
        }, {
            actions: {
                logStateEntry: (context, event, { state }) => {
                    logger.info(`🔄 Entering state: ${state.value}`);
                }
            },
            services: {
                orchestratorStart: (context) => this._orchestratorStartNode(context.chatState),
                queryAnalysis: (context) => this._queryAnalysisNode(context.chatState),
                toolPlanning: (context) => this._toolPlanningNode(context.chatState),
                toolExecution: (context) => this._toolExecutionNode(context.chatState),
                routingDecision: (context) => this._routingDecisionNode(context.chatState),
                incidentAnalysis: (context) => this._incidentAnalysisNode(context.chatState),
                responseEnrichment: (context) => this._responseEnrichmentNode(context.chatState),
                orchestratorFinish: (context) => this._orchestratorFinishNode(context.chatState),
                errorRecovery: (context) => this._errorRecoveryNode(context.chatState, context.error)
            }
        });
    }

    /**
     * Main entry point to process a user query through the complete workflow
     * @param {string} userQuery - User's query
     * @param {string} [sessionId] - Optional session ID
     * @returns {Promise<Object>} Workflow results
     */
    async processQuery(userQuery, sessionId = null) {
        try {
            logger.info(`🚀 Processing query: '${userQuery}'`);
            
            // Create initial state
            const initialState = createInitialState(userQuery, sessionId);
            
            // Create workflow service
            const workflowService = interpret(this.workflowMachine.withContext({
                chatState: initialState,
                sessionId: initialState.session_id,
                error: null
            }));
            
            // Store active workflow
            this.activeWorkflows.set(initialState.session_id, workflowService);
            
            // Execute the workflow
            return new Promise((resolve, reject) => {
                workflowService
                    .onDone((event) => {
                        // Extract final response
                        const response = this._formatWorkflowResponse(event.data.chatState);
                        
                        // Cleanup
                        this.activeWorkflows.delete(initialState.session_id);
                        
                        logger.info(`✅ Query processing completed successfully`);
                        resolve(response);
                    })
                    .onError((error) => {
                        // Cleanup
                        this.activeWorkflows.delete(initialState.session_id);
                        
                        logger.error(`❌ Query processing failed: ${error.message}`);
                        reject(error);
                    })
                    .start();
            });
            
        } catch (error) {
            logger.error(`❌ Query processing failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                response: 'I encountered an error while processing your request. Please try again.',
                details: {}
            };
        }
    }

    // State machine node implementations

    /**
     * Orchestrator initialization node
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Updated state
     */
    async _orchestratorStartNode(state) {
        logger.info('🎯 Orchestrator: Starting workflow');
        
        // Let orchestrator validate and initialize
        const updatedState = await this.orchestrator.orchestrateWorkflow(state);
        
        return {
            ...updatedState,
            workflow_status: 'running',
            investigation_depth: 1
        };
    }

    /**
     * Query analysis processing node
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Updated state
     */
    async _queryAnalysisNode(state) {
        logger.info('🔍 Query Analysis: Analyzing user query');
        
        return await this.queryAnalyzer.analyzeQuery(state);
    }

    /**
     * Tool planning and sequencing node
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Updated state
     */
    async _toolPlanningNode(state) {
        logger.info('🛠️ Tool Planning: Creating execution plan using LLM');
        
        // Determine tool sequence based on LLM analysis
        const toolSequence = await this._planToolSequence(state);
        
        return {
            ...state,
            tool_sequence: toolSequence,
            current_tool_index: 0
        };
    }

    /**
     * MCP tool execution node
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Updated state
     */
    async _toolExecutionNode(state) {
        logger.info('⚙️ Tool Execution: Executing MCP tools');
        
        return await this.toolExecutor.executeTools(state);
    }

    /**
     * Routing decision node
     * @param {Object} state - Current state
     * @returns {Promise<string>} Routing decision
     */
    async _routingDecisionNode(state) {
        logger.info('🚦 Routing Decision: Determining next step');
        
        try {
            // Use LLM for intelligent routing decisions
            const routingDecision = await llm_client.makeRoutingDecision(state);
            
            // Validate routing decision
            const validRoutes = ['incident_analysis', 'response_enrichment', 'error_recovery'];
            if (validRoutes.includes(routingDecision)) {
                logger.info(`🤖 LLM routing decision: ${routingDecision}`);
                return routingDecision;
            }
            
            logger.warn(`Invalid LLM routing decision: ${routingDecision}, using fallback`);
            
        } catch (error) {
            logger.error(`Error in LLM routing decision, using fallback: ${error.message}`);
        }
        
        // Fallback routing logic
        const queryType = state.query_type || '';
        const hasIncidents = this._checkForIncidentData(state);
        
        if (['incident_analysis', 'root_cause'].includes(queryType) || hasIncidents) {
            logger.info('🚨 Fallback routing to incident analysis');
            return 'incident_analysis';
        }
        
        logger.info('✨ Fallback routing to response enrichment');
        return 'response_enrichment';
    }

    /**
     * Specialized incident analysis node
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Updated state
     */
    async _incidentAnalysisNode(state) {
        logger.info('🚨 Incident Analysis: Performing deep incident analysis');
        
        return await this.incidentAnalyzer.analyzeIncidentData(state);
    }

    /**
     * Response enrichment and finalization node
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Updated state
     */
    async _responseEnrichmentNode(state) {
        logger.info('✨ Response Enrichment: Enriching final response');
        
        return await this.responseEnricher.enrichResponse(state);
    }

    /**
     * Orchestrator finalization node
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Updated state
     */
    async _orchestratorFinishNode(state) {
        logger.info('🎯 Orchestrator: Finalizing workflow');
        
        // Final validation and cleanup
        const finalState = {
            ...state,
            workflow_status: 'completed',
            completion_timestamp: new Date().toISOString()
        };
        
        return finalState;
    }

    /**
     * Error recovery node
     * @param {Object} state - Current state
     * @param {Error} error - Error that occurred
     * @returns {Promise<Object>} Recovery state
     */
    async _errorRecoveryNode(state, error) {
        logger.info('🔧 Error Recovery: Handling workflow error');
        
        return {
            ...state,
            workflow_status: 'failed',
            final_response: 'I encountered an error while processing your request. Please try again.',
            error_details: error?.message || 'Unknown error',
            completion_timestamp: new Date().toISOString()
        };
    }

    // Helper methods

    /**
     * Check if MCP results contain incident-related data
     * @param {Object} state - Current state
     * @returns {boolean} Has incident data
     */
    _checkForIncidentData(state) {
        for (const result of (state.mcp_results || [])) {
            if (!result.success) {
                continue;
            }
            
            const toolName = result.tool_name;
            
            // Check for incident-related tools
            if (['get_incidents', 'search_incidents', 'get_incident_by_id'].includes(toolName)) {
                const data = result.result?.data || result.result || {};
                if (typeof data === 'object' && (data.incidents || data.incident)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Plan the sequence of MCP tools to execute using LLM analysis
     * @param {Object} state - Current state
     * @returns {Promise<Array<string>>} Tool sequence
     */
    async _planToolSequence(state) {
        try {
            // Use LLM to dynamically plan tool sequence
            const toolPlan = await llmClient.planToolSequence(
                state.query_analysis || {},
                state.available_tools || []
            );
            
            // Extract tool names from the plan
            if (Array.isArray(toolPlan)) {
                return toolPlan;
            }
            
            // If LLM returns unexpected format, fall back to basic tools
            logger.warn(`Unexpected tool plan format from LLM: ${JSON.stringify(toolPlan)}`);
            return ['get_database_stats', 'get_schema'];
            
        } catch (error) {
            logger.error(`Error in LLM tool planning, using fallback: ${error.message}`);
            
            // Fallback to basic tool planning
            const queryType = state.query_type || 'general';
            
            if (queryType === 'incident_analysis') {
                return ['get_incidents', 'search_logs'];
            } else if (queryType === 'exploration') {
                return ['get_schema', 'get_node_labels', 'get_database_stats'];
            } else if (queryType === 'root_cause') {
                return ['search_logs', 'get_incidents'];
            } else {
                return ['get_database_stats', 'get_schema'];
            }
        }
    }

    /**
     * Format the final workflow response for external consumption
     * @param {Object} finalState - Final state
     * @returns {Object} Formatted response
     */
    _formatWorkflowResponse(finalState) {
        const success = finalState.workflow_status === 'completed';
        
        const response = {
            success: success,
            response: finalState.final_response || 'Analysis completed',
            query_analysis: {
                query_type: finalState.query_type,
                intent: finalState.intent,
                confidence_score: finalState.confidence_score || 0
            },
            execution_summary: {
                tools_executed: (finalState.executed_tools || []).length,
                tools_planned: (finalState.tool_sequence || []).length,
                success_rate: this._calculateExecutionSuccessRate(finalState),
                investigation_depth: finalState.investigation_depth || 1
            },
            enrichment: finalState.enrichment_data || {},
            session_info: {
                session_id: finalState.session_id,
                request_id: finalState.request_id,
                timestamp: finalState.completion_timestamp
            }
        };
        
        // Add incident analysis if available
        if (finalState.incident_analysis) {
            response.incident_analysis = {
                root_causes_found: (finalState.incident_analysis.root_causes || []).length,
                correlations_found: (finalState.incident_analysis.correlations || []).length,
                confidence: finalState.incident_analysis.confidence_score || 0
            };
        }
        
        return response;
    }

    /**
     * Calculate the success rate of tool executions
     * @param {Object} state - Final state
     * @returns {number} Success rate (0-1)
     */
    _calculateExecutionSuccessRate(state) {
        const mcpResults = state.mcp_results || [];
        if (mcpResults.length === 0) {
            return 0.0;
        }
        
        const successful = mcpResults.filter(result => result.success).length;
        return successful / mcpResults.length;
    }

    /**
     * Get current workflow status and metrics
     * @returns {Object} Workflow status
     */
    getWorkflowStatus() {
        return {
            workflow_name: 'LangGraph MCP Orchestrator',
            version: '1.0.0',
            active_workflows: this.activeWorkflows.size,
            states: [
                'orchestrator_start',
                'query_analysis',
                'tool_planning',
                'tool_execution',
                'routing_decision',
                'incident_analysis',
                'response_enrichment',
                'orchestrator_finish',
                'error_recovery',
                'completed'
            ],
            agents: {
                orchestrator: this.orchestrator.getOrchestratorStatus(),
                query_analyzer: { name: this.queryAnalyzer.name },
                tool_executor: { name: this.toolExecutor.name },
                incident_analyzer: { name: this.incidentAnalyzer.name },
                response_enricher: { name: this.responseEnricher.name }
            }
        };
    }

    /**
     * Get status of a specific workflow session
     * @param {string} sessionId - Session ID
     * @returns {Object|null} Session status
     */
    getSessionStatus(sessionId) {
        const workflow = this.activeWorkflows.get(sessionId);
        if (!workflow) {
            return null;
        }
        
        return {
            session_id: sessionId,
            current_state: workflow.getSnapshot().value,
            context: workflow.getSnapshot().context
        };
    }

    /**
     * Stop a specific workflow session
     * @param {string} sessionId - Session ID
     */
    stopSession(sessionId) {
        const workflow = this.activeWorkflows.get(sessionId);
        if (workflow) {
            workflow.stop();
            this.activeWorkflows.delete(sessionId);
            logger.info(`🛑 Stopped workflow session: ${sessionId}`);
        }
    }
}

export default LangGraphWorkflow;