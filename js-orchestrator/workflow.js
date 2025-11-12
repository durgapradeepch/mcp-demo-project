/**
 * LangGraph Workflow - Main state machine for orchestrating the MCP chatbot workflow
 * JavaScript implementation using @langchain/langgraph for state management
 */

import winston from 'winston';
import { StateGraph, END, MemorySaver } from '@langchain/langgraph';
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
 * Now using the actual LangGraph library instead of XState
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
        
        // Build the LangGraph workflow
        this.workflow = this._buildWorkflowGraph();
        
        // Compile with memory
        this.app = this.workflow.compile({
            checkpointer: new MemorySaver(),
            interruptBefore: [],  // No human-in-the-loop for now
            interruptAfter: []
        });
    }

    /**
     * Build the LangGraph state machine workflow
     * @returns {StateGraph} LangGraph state graph
     */
    _buildWorkflowGraph() {
        // Create a simple workflow graph - we'll use the basic object structure for now
        // and handle state management manually within the nodes
        const workflow = new StateGraph({
            state: { value: {} }
        });
        
        // Add nodes for each processing stage
        workflow.addNode("orchestratorStart", this._orchestratorStartNode.bind(this));
        workflow.addNode("queryAnalysis", this._queryAnalysisNode.bind(this));
        workflow.addNode("toolPlanning", this._toolPlanningNode.bind(this));
        workflow.addNode("toolExecution", this._toolExecutionNode.bind(this));
        workflow.addNode("incidentAnalysis", this._incidentAnalysisNode.bind(this));
        workflow.addNode("responseEnrichment", this._responseEnrichmentNode.bind(this));
        workflow.addNode("orchestratorFinish", this._orchestratorFinishNode.bind(this));
        
        // Set entry point
        workflow.setEntryPoint("orchestratorStart");
        
        // Define the main workflow path
        workflow.addEdge("orchestratorStart", "queryAnalysis");
        workflow.addEdge("queryAnalysis", "toolPlanning");
        workflow.addEdge("toolPlanning", "toolExecution");
        
        // Conditional routing after tool execution
        workflow.addConditionalEdges(
            "toolExecution",
            this._routeAfterToolExecution.bind(this),
            {
                "incident_analysis": "incidentAnalysis",
                "response_enrichment": "responseEnrichment",
                "error_recovery": "orchestratorFinish"
            }
        );
        
        // Routes from incident analysis
        workflow.addEdge("incidentAnalysis", "responseEnrichment");
        
        // Routes to completion
        workflow.addEdge("responseEnrichment", "orchestratorFinish");
        workflow.addEdge("orchestratorFinish", END);
        
        return workflow;
    }

    /**
     * Main entry point to process a user query through the complete workflow
     * @param {string} userQuery - The user's query
     * @param {string} sessionId - Optional session ID
     * @returns {Promise<Object>} Response object
     */
    async processQuery(userQuery, sessionId = null) {
        try {
            logger.info(`🚀 Processing query: '${userQuery}'`);
            
            // Create initial state
            const initialState = createInitialState(userQuery, sessionId);
            
            // Execute the workflow
            const result = await this.app.invoke(
                initialState,
                {
                    configurable: {
                        thread_id: sessionId || initialState.sessionId
                    }
                }
            );
            
            // Extract final response
            const response = this._formatWorkflowResponse(result);
            
            logger.info(`✅ Query processing completed successfully`);
            return response;
            
        } catch (error) {
            logger.error(`❌ Query processing failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                response: "I encountered an error while processing your request. Please try again.",
                details: {}
            };
        }
    }

    // Node implementations

    /**
     * Orchestrator initialization node
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Updated state
     */
    async _orchestratorStartNode(state) {
        logger.info("🎯 Orchestrator: Starting workflow");
        
        // Let orchestrator validate and initialize
        const updatedState = await this.orchestrator.orchestrateWorkflow(state);
        
        return {
            ...updatedState,
            workflowStatus: "running",
            investigationDepth: 1
        };
    }

    /**
     * Query analysis processing node
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Updated state
     */
    async _queryAnalysisNode(state) {
        logger.info("🔍 Query Analysis: Analyzing user query");
        
        return await this.queryAnalyzer.analyzeQuery(state);
    }

    /**
     * Tool planning and sequencing node
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Updated state
     */
    async _toolPlanningNode(state) {
        logger.info("🛠️ Tool Planning: Creating execution plan using LLM");
        
        // Determine tool sequence based on LLM analysis
        const toolSequence = await this._planToolSequence(state);
        
        return {
            ...state,
            toolSequence,
            currentAgent: 'tool_executor'
        };
    }

    /**
     * Tool execution node
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Updated state
     */
    async _toolExecutionNode(state) {
        logger.info("⚙️ Tool Execution: Executing planned tools");
        
        return await this.toolExecutor.executeTool(state);
    }

    /**
     * Incident analysis node
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Updated state
     */
    async _incidentAnalysisNode(state) {
        logger.info("🔬 Incident Analysis: Analyzing incidents and patterns");
        
        return await this.incidentAnalyzer.analyzeIncidents(state);
    }

    /**
     * Response enrichment node
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Updated state
     */
    async _responseEnrichmentNode(state) {
        logger.info("✨ Response Enrichment: Creating enriched response");
        
        return await this.responseEnricher.enrichResponse(state);
    }

    /**
     * Orchestrator finish node
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Updated state
     */
    async _orchestratorFinishNode(state) {
        logger.info("🏁 Orchestrator: Finishing workflow");
        
        const finalState = await this.orchestrator.finalizeWorkflow(state);
        
        return {
            ...finalState,
            workflowStatus: "completed"
        };
    }

    /**
     * Route after tool execution based on analysis
     * @param {Object} state - Current state
     * @returns {string} Next node name
     */
    _routeAfterToolExecution(state) {
        // Determine routing based on query type and results
        if (state.queryType === 'incident_analysis' || 
            (state.mcpResults && state.mcpResults.some(r => r.tool_name?.includes('incident')))) {
            return "incident_analysis";
        }
        
        if (state.errorCount > 2) {
            return "error_recovery";
        }
        
        return "response_enrichment";
    }

    /**
     * Plan tool sequence using LLM analysis
     * @param {Object} state - Current state
     * @returns {Promise<Array>} Tool sequence
     */
    async _planToolSequence(state) {
        const analysisPrompt = `
        Based on this user query: "${state.userQuery}"
        Query type: ${state.queryType}
        Intent: ${state.intent}
        Entities: ${state.entities.join(', ')}
        
        Plan an optimal sequence of MCP tools to gather relevant information.
        
        Available tools: neo4j_query, list_incidents, analyze_relationships, 
        get_timeline, search_nodes, correlation_analysis
        
        Return a JSON array of tool names in execution order.
        `;
        
        try {
            const response = await llmClient.createCompletion({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: analysisPrompt }],
                temperature: 0.3,
                max_tokens: 500
            });
            
            const content = response.choices[0].message.content.trim();
            const toolSequence = JSON.parse(content);
            
            logger.info(`📋 Planned tool sequence: ${toolSequence.join(' → ')}`);
            return Array.isArray(toolSequence) ? toolSequence : [];
            
        } catch (error) {
            logger.error(`Error planning tool sequence: ${error.message}`);
            // Fallback to default sequence
            return ['neo4j_query', 'analyze_relationships'];
        }
    }

    /**
     * Format the final workflow response
     * @param {Object} result - Workflow result
     * @returns {Object} Formatted response
     */
    _formatWorkflowResponse(result) {
        return {
            success: true,
            response: result.finalResponse || "Query processed successfully.",
            details: {
                session_id: result.sessionId,
                request_id: result.requestId,
                query_type: result.queryType,
                tools_executed: result.executedTools,
                data_quality_score: result.dataQualityScore,
                response_completeness: result.responseCompleteness,
                investigation_depth: result.investigationDepth,
                correlations_found: result.correlations?.length || 0,
                forward_links: result.forwardLinks,
                annotations: result.annotations
            },
            metadata: {
                workflow_version: '2.0.0-langgraph',
                processing_time: new Date().toISOString(),
                agent_sequence: [
                    'orchestrator',
                    'query_analyzer', 
                    'tool_executor',
                    result.queryType === 'incident_analysis' ? 'incident_analyzer' : null,
                    'response_enricher'
                ].filter(Boolean)
            }
        };
    }

    /**
     * Get workflow status information
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            workflow_name: 'LangGraph MCP Orchestrator',
            version: '2.0.0-langgraph',
            library_version: '1.0.1',
            agents: {
                orchestrator: this.orchestrator.getOrchestratorStatus(),
                query_analyzer: { name: this.queryAnalyzer.name },
                tool_executor: { name: this.toolExecutor.name },
                incident_analyzer: { name: this.incidentAnalyzer.name },
                response_enricher: { name: this.responseEnricher.name }
            },
            nodes: [
                'orchestratorStart',
                'queryAnalysis',
                'toolPlanning',
                'toolExecution',
                'incidentAnalysis',
                'responseEnrichment',
                'orchestratorFinish'
            ]
        };
    }
}

export default LangGraphWorkflow;