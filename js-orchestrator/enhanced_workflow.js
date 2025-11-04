/**
 * Enhanced LangGraph Workflow - Advanced multi-query processing with parallel/sequential execution
 * JavaScript implementation using XState for complex orchestration patterns
 */

import winston from 'winston';
import { createMachine, interpret, assign } from 'xstate';
import LangGraphWorkflow from './workflow.js';
import { createInitialState } from './state.js';
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
 * Enhanced workflow for processing complex multi-query requests
 * Supports parallel execution, query dependencies, and advanced orchestration
 */
class EnhancedLangGraphWorkflow {
    constructor(mcpClient) {
        this.mcpClient = mcpClient;
        
        // Base workflow for single query processing
        this.baseWorkflow = new LangGraphWorkflow(mcpClient);
        
        // Enhanced workflow state machine
        this.enhancedWorkflowMachine = this._buildEnhancedWorkflowMachine();
        
        // Services for storing active enhanced workflows
        this.activeEnhancedWorkflows = new Map();
        
        // Metrics and performance tracking
        this.performanceMetrics = {
            totalQueries: 0,
            successfulQueries: 0,
            parallelExecutions: 0,
            sequentialExecutions: 0,
            averageExecutionTime: 0
        };
    }

    /**
     * Build the enhanced XState workflow state machine
     * @returns {Object} XState machine definition
     */
    _buildEnhancedWorkflowMachine() {
        return createMachine({
            id: 'enhancedLangGraphWorkflow',
            initial: 'query_decomposition',
            context: {
                originalQuery: null,
                subQueries: [],
                executionPlan: null,
                executionResults: [],
                sessionId: null,
                error: null,
                startTime: null
            },
            states: {
                query_decomposition: {
                    entry: 'logStateEntry',
                    invoke: {
                        src: 'decomposeQuery',
                        onDone: {
                            target: 'execution_planning',
                            actions: assign({
                                subQueries: (_, event) => event.data.subQueries,
                                startTime: () => Date.now()
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
                
                execution_planning: {
                    entry: 'logStateEntry',
                    invoke: {
                        src: 'planExecution',
                        onDone: {
                            target: 'query_execution',
                            actions: assign({
                                executionPlan: (_, event) => event.data
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
                
                query_execution: {
                    entry: 'logStateEntry',
                    invoke: {
                        src: 'executeQueries',
                        onDone: {
                            target: 'result_aggregation',
                            actions: assign({
                                executionResults: (_, event) => event.data
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
                
                result_aggregation: {
                    entry: 'logStateEntry',
                    invoke: {
                        src: 'aggregateResults',
                        onDone: {
                            target: 'final_synthesis',
                            actions: assign({
                                aggregatedResults: (_, event) => event.data
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
                
                final_synthesis: {
                    entry: 'logStateEntry',
                    invoke: {
                        src: 'synthesizeResponse',
                        onDone: {
                            target: 'completed',
                            actions: assign({
                                finalResponse: (_, event) => event.data
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
                        src: 'recoverFromError',
                        onDone: {
                            target: 'completed',
                            actions: assign({
                                finalResponse: (_, event) => event.data
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
                    logger.info(`🔄 Enhanced Workflow entering state: ${state.value}`);
                }
            },
            services: {
                decomposeQuery: (context) => this._decomposeQueryNode(context),
                planExecution: (context) => this._planExecutionNode(context),
                executeQueries: (context) => this._executeQueriesNode(context),
                aggregateResults: (context) => this._aggregateResultsNode(context),
                synthesizeResponse: (context) => this._synthesizeResponseNode(context),
                recoverFromError: (context) => this._errorRecoveryNode(context)
            }
        });
    }

    /**
     * Main entry point for processing complex multi-query requests
     * @param {string} userQuery - Complex user query
     * @param {string} [sessionId] - Optional session ID
     * @returns {Promise<Object>} Enhanced workflow results
     */
    async processComplexQuery(userQuery, sessionId = null) {
        try {
            logger.info(`🚀 Processing complex query: '${userQuery}'`);
            
            // Generate session ID if not provided
            if (!sessionId) {
                sessionId = `enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            
            // Create enhanced workflow service
            const enhancedWorkflowService = interpret(this.enhancedWorkflowMachine.withContext({
                originalQuery: userQuery,
                subQueries: [],
                executionPlan: null,
                executionResults: [],
                sessionId: sessionId,
                error: null,
                startTime: null
            }));
            
            // Store active enhanced workflow
            this.activeEnhancedWorkflows.set(sessionId, enhancedWorkflowService);
            
            // Execute the enhanced workflow
            return new Promise((resolve, reject) => {
                enhancedWorkflowService
                    .onDone((event) => {
                        // Update performance metrics
                        this._updatePerformanceMetrics(event.data);
                        
                        // Extract final response
                        const response = this._formatEnhancedWorkflowResponse(event.data);
                        
                        // Cleanup
                        this.activeEnhancedWorkflows.delete(sessionId);
                        
                        logger.info(`✅ Complex query processing completed successfully`);
                        resolve(response);
                    })
                    .onError((error) => {
                        // Cleanup
                        this.activeEnhancedWorkflows.delete(sessionId);
                        
                        logger.error(`❌ Complex query processing failed: ${error.message}`);
                        reject(error);
                    })
                    .start();
            });
            
        } catch (error) {
            logger.error(`❌ Complex query processing failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                response: 'I encountered an error while processing your complex request. Please try again.',
                details: {}
            };
        }
    }

    // Enhanced workflow node implementations

    /**
     * Decompose complex query into sub-queries using LLM analysis
     * @param {Object} context - Workflow context
     * @returns {Promise<Object>} Decomposition result
     */
    async _decomposeQueryNode(context) {
        logger.info('🧩 Query Decomposition: Breaking down complex query');
        
        try {
            // Use LLM to intelligently decompose the query
            const decompositionResult = await this._intelligentQueryDecomposition(context.originalQuery);
            
            logger.info(`📋 Decomposed into ${decompositionResult.subQueries.length} sub-queries`);
            return decompositionResult;
            
        } catch (error) {
            logger.error(`Error in query decomposition: ${error.message}`);
            
            // Fallback to simple decomposition
            return {
                subQueries: [context.originalQuery],
                decompositionStrategy: 'fallback_single',
                confidence: 0.5
            };
        }
    }

    /**
     * Plan execution strategy for sub-queries (parallel vs sequential)
     * @param {Object} context - Workflow context
     * @returns {Promise<Object>} Execution plan
     */
    async _planExecutionNode(context) {
        logger.info('📋 Execution Planning: Determining execution strategy');
        
        try {
            // Use LLM to analyze dependencies and plan execution
            const executionPlan = await this._planExecutionStrategy(context.subQueries);
            
            logger.info(`🎯 Execution plan: ${executionPlan.strategy} (${executionPlan.batches.length} batches)`);
            return executionPlan;
            
        } catch (error) {
            logger.error(`Error in execution planning: ${error.message}`);
            
            // Fallback to sequential execution
            return {
                strategy: 'sequential',
                batches: context.subQueries.map((query, index) => ({
                    batchId: index,
                    queries: [query],
                    dependencies: []
                })),
                maxParallelism: 1
            };
        }
    }

    /**
     * Execute sub-queries according to the execution plan
     * @param {Object} context - Workflow context
     * @returns {Promise<Array>} Execution results
     */
    async _executeQueriesNode(context) {
        logger.info('⚙️ Query Execution: Executing sub-queries');
        
        const results = [];
        const { strategy, batches } = context.executionPlan;
        
        try {
            if (strategy === 'parallel') {
                // Execute batches with controlled parallelism
                for (const batch of batches) {
                    logger.info(`🔄 Executing batch ${batch.batchId} with ${batch.queries.length} queries`);
                    
                    const batchResults = await Promise.allSettled(
                        batch.queries.map(query => this._executeSingleQuery(query, context.sessionId))
                    );
                    
                    // Process batch results
                    batchResults.forEach((result, index) => {
                        if (result.status === 'fulfilled') {
                            results.push({
                                query: batch.queries[index],
                                result: result.value,
                                success: true,
                                batchId: batch.batchId
                            });
                        } else {
                            logger.error(`Query failed: ${result.reason.message}`);
                            results.push({
                                query: batch.queries[index],
                                error: result.reason.message,
                                success: false,
                                batchId: batch.batchId
                            });
                        }
                    });
                }
                
                this.performanceMetrics.parallelExecutions++;
                
            } else {
                // Sequential execution
                for (const batch of batches) {
                    for (const query of batch.queries) {
                        logger.info(`🔄 Executing sequential query: '${query}'`);
                        
                        try {
                            const result = await this._executeSingleQuery(query, context.sessionId);
                            results.push({
                                query: query,
                                result: result,
                                success: true,
                                batchId: batch.batchId
                            });
                        } catch (error) {
                            logger.error(`Sequential query failed: ${error.message}`);
                            results.push({
                                query: query,
                                error: error.message,
                                success: false,
                                batchId: batch.batchId
                            });
                        }
                    }
                }
                
                this.performanceMetrics.sequentialExecutions++;
            }
            
            logger.info(`📊 Executed ${results.length} queries, ${results.filter(r => r.success).length} successful`);
            return results;
            
        } catch (error) {
            logger.error(`Error in query execution: ${error.message}`);
            throw error;
        }
    }

    /**
     * Aggregate results from multiple sub-query executions
     * @param {Object} context - Workflow context
     * @returns {Promise<Object>} Aggregated results
     */
    async _aggregateResultsNode(context) {
        logger.info('📊 Result Aggregation: Combining execution results');
        
        try {
            const successfulResults = context.executionResults.filter(r => r.success);
            const failedResults = context.executionResults.filter(r => !r.success);
            
            // Aggregate successful results by type
            const aggregatedData = {
                mcpResults: [],
                incidentAnalysis: [],
                enrichmentData: {},
                queryAnalyses: []
            };
            
            // Process each successful result
            for (const execResult of successfulResults) {
                const result = execResult.result;
                
                // Aggregate MCP results
                if (result.execution_summary && result.execution_summary.tools_executed > 0) {
                    // This result has MCP tool execution data
                    if (result.mcp_results) {
                        aggregatedData.mcpResults.push(...result.mcp_results);
                    }
                }
                
                // Aggregate incident analysis
                if (result.incident_analysis) {
                    aggregatedData.incidentAnalysis.push(result.incident_analysis);
                }
                
                // Aggregate enrichment data
                if (result.enrichment) {
                    Object.assign(aggregatedData.enrichmentData, result.enrichment);
                }
                
                // Aggregate query analyses
                if (result.query_analysis) {
                    aggregatedData.queryAnalyses.push({
                        originalQuery: execResult.query,
                        analysis: result.query_analysis
                    });
                }
            }
            
            // Calculate aggregate statistics
            const aggregateStats = {
                totalQueries: context.executionResults.length,
                successfulQueries: successfulResults.length,
                failedQueries: failedResults.length,
                totalToolsExecuted: aggregatedData.mcpResults.length,
                totalIncidents: aggregatedData.incidentAnalysis.length,
                overallSuccessRate: successfulResults.length / context.executionResults.length
            };
            
            logger.info(`📈 Aggregated ${aggregateStats.totalQueries} queries, ${aggregateStats.successfulQueries} successful`);
            
            return {
                aggregatedData,
                aggregateStats,
                successfulResults,
                failedResults
            };
            
        } catch (error) {
            logger.error(`Error in result aggregation: ${error.message}`);
            throw error;
        }
    }

    /**
     * Synthesize final response from aggregated results using LLM
     * @param {Object} context - Workflow context
     * @returns {Promise<Object>} Synthesized response
     */
    async _synthesizeResponseNode(context) {
        logger.info('✨ Final Synthesis: Creating comprehensive response');
        
        try {
            // Use LLM to synthesize a comprehensive response
            const synthesizedResponse = await this._synthesizeComprehensiveResponse(
                context.originalQuery,
                context.aggregatedResults
            );
            
            // Calculate execution time
            const executionTime = Date.now() - context.startTime;
            
            return {
                ...synthesizedResponse,
                executionTime,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            logger.error(`Error in response synthesis: ${error.message}`);
            
            // Fallback synthesis
            const { aggregateStats } = context.aggregatedResults;
            return {
                response: `I processed your complex query and executed ${aggregateStats.totalQueries} sub-queries with ${aggregateStats.successfulQueries} successful results.`,
                confidence: 0.6,
                executionTime: Date.now() - context.startTime,
                timestamp: new Date().toISOString(),
                fallback: true
            };
        }
    }

    /**
     * Error recovery for enhanced workflow
     * @param {Object} context - Workflow context
     * @returns {Promise<Object>} Recovery response
     */
    async _errorRecoveryNode(context) {
        logger.info('🔧 Enhanced Error Recovery: Handling workflow error');
        
        const executionTime = context.startTime ? Date.now() - context.startTime : 0;
        
        return {
            response: 'I encountered an error while processing your complex request. Some sub-queries may have been processed successfully.',
            error: context.error?.message || 'Unknown error',
            partialResults: context.executionResults || [],
            executionTime,
            timestamp: new Date().toISOString()
        };
    }

    // Helper methods for enhanced workflow

    /**
     * Execute a single query using the base workflow
     * @param {string} query - Query to execute
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object>} Query result
     */
    async _executeSingleQuery(query, sessionId) {
        const subSessionId = `${sessionId}_sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        // Use base workflow for single query processing
        return await this.baseWorkflow.processQuery(query, subSessionId);
    }

    /**
     * Intelligently decompose complex query using LLM
     * @param {string} originalQuery - Original complex query
     * @returns {Promise<Object>} Decomposition result
     */
    async _intelligentQueryDecomposition(originalQuery) {
        try {
            // Construct decomposition prompt
            const decompositionPrompt = `
            Analyze this complex query and decompose it into logical sub-queries that can be processed independently:
            
            Query: "${originalQuery}"
            
            Provide a JSON response with:
            1. subQueries: Array of specific, actionable sub-queries
            2. decompositionStrategy: The strategy used (parallel, sequential, or hybrid)
            3. confidence: Confidence score (0-1) in the decomposition
            4. dependencies: Array indicating which sub-queries depend on others
            
            Guidelines:
            - Each sub-query should be specific and actionable
            - Identify queries that can run in parallel vs those that need sequential execution
            - Consider data dependencies between queries
            - Aim for 2-5 sub-queries when possible
            `;
            
            const response = await llmClient.analyzeQueryIntent(decompositionPrompt);
            
            // Try to parse LLM response as JSON
            if (typeof response === 'string') {
                try {
                    const parsed = JSON.parse(response);
                    if (parsed.subQueries && Array.isArray(parsed.subQueries)) {
                        return parsed;
                    }
                } catch (parseError) {
                    logger.warn(`Failed to parse LLM decomposition response: ${parseError.message}`);
                }
            }
            
            // If LLM response is not in expected format, use simple decomposition
            return this._simpleQueryDecomposition(originalQuery);
            
        } catch (error) {
            logger.error(`Error in intelligent query decomposition: ${error.message}`);
            return this._simpleQueryDecomposition(originalQuery);
        }
    }

    /**
     * Simple fallback query decomposition
     * @param {string} originalQuery - Original query
     * @returns {Object} Simple decomposition
     */
    _simpleQueryDecomposition(originalQuery) {
        // Simple patterns to detect multi-part queries
        const conjunctions = ['and', 'also', 'plus', 'additionally', 'furthermore'];
        const questions = ['what', 'how', 'when', 'where', 'why', 'who'];
        
        let subQueries = [];
        
        // Split on conjunctions
        for (const conjunction of conjunctions) {
            if (originalQuery.toLowerCase().includes(` ${conjunction} `)) {
                subQueries = originalQuery
                    .split(new RegExp(`\\s+${conjunction}\\s+`, 'i'))
                    .map(q => q.trim())
                    .filter(q => q.length > 0);
                break;
            }
        }
        
        // If no conjunctions found, check for multiple question patterns
        if (subQueries.length === 0) {
            const questionCount = questions.reduce((count, q) => {
                return count + (originalQuery.toLowerCase().match(new RegExp(`\\b${q}\\b`, 'g')) || []).length;
            }, 0);
            
            if (questionCount > 1) {
                // Split on sentence boundaries for multiple questions
                subQueries = originalQuery
                    .split(/[.!?]+/)
                    .map(q => q.trim())
                    .filter(q => q.length > 0);
            }
        }
        
        // Fallback to single query
        if (subQueries.length === 0) {
            subQueries = [originalQuery];
        }
        
        return {
            subQueries: subQueries,
            decompositionStrategy: subQueries.length > 1 ? 'simple_split' : 'single',
            confidence: subQueries.length > 1 ? 0.7 : 0.9,
            dependencies: [] // Simple decomposition assumes no dependencies
        };
    }

    /**
     * Plan execution strategy for sub-queries
     * @param {Array<string>} subQueries - Sub-queries to execute
     * @returns {Promise<Object>} Execution plan
     */
    async _planExecutionStrategy(subQueries) {
        try {
            // Use LLM to analyze dependencies and plan execution
            const planningPrompt = `
            Analyze these sub-queries and create an optimal execution plan:
            
            Sub-queries: ${JSON.stringify(subQueries)}
            
            Provide a JSON response with:
            1. strategy: "parallel" or "sequential" or "hybrid"
            2. batches: Array of execution batches with queries and dependencies
            3. maxParallelism: Maximum number of parallel executions
            4. reasoning: Brief explanation of the strategy
            
            Consider:
            - Which queries can run independently in parallel
            - Which queries depend on results from others
            - Optimal batching for performance
            `;
            
            const response = await llmClient.planToolSequence(
                { queries: subQueries },
                ['parallel_execution', 'sequential_execution']
            );
            
            // Process LLM response
            if (Array.isArray(response)) {
                // Simple array response - assume parallel execution
                return {
                    strategy: 'parallel',
                    batches: [{
                        batchId: 0,
                        queries: subQueries,
                        dependencies: []
                    }],
                    maxParallelism: Math.min(subQueries.length, 3)
                };
            }
            
            // Fallback to simple strategy
            return this._simpleExecutionPlanning(subQueries);
            
        } catch (error) {
            logger.error(`Error in execution strategy planning: ${error.message}`);
            return this._simpleExecutionPlanning(subQueries);
        }
    }

    /**
     * Simple execution planning fallback
     * @param {Array<string>} subQueries - Sub-queries
     * @returns {Object} Simple execution plan
     */
    _simpleExecutionPlanning(subQueries) {
        // Simple heuristic: if 3 or fewer queries, run in parallel; otherwise sequential
        if (subQueries.length <= 3) {
            return {
                strategy: 'parallel',
                batches: [{
                    batchId: 0,
                    queries: subQueries,
                    dependencies: []
                }],
                maxParallelism: subQueries.length
            };
        } else {
            return {
                strategy: 'sequential',
                batches: subQueries.map((query, index) => ({
                    batchId: index,
                    queries: [query],
                    dependencies: []
                })),
                maxParallelism: 1
            };
        }
    }

    /**
     * Synthesize comprehensive response from aggregated results
     * @param {string} originalQuery - Original query
     * @param {Object} aggregatedResults - Aggregated results
     * @returns {Promise<Object>} Synthesized response
     */
    async _synthesizeComprehensiveResponse(originalQuery, aggregatedResults) {
        try {
            const synthesisPrompt = `
            Create a comprehensive response to this complex query based on the aggregated results:
            
            Original Query: "${originalQuery}"
            
            Aggregated Results Summary:
            - Total queries processed: ${aggregatedResults.aggregateStats.totalQueries}
            - Successful queries: ${aggregatedResults.aggregateStats.successfulQueries}
            - Total tools executed: ${aggregatedResults.aggregateStats.totalToolsExecuted}
            - Incidents found: ${aggregatedResults.aggregateStats.totalIncidents}
            
            Requirements:
            1. Provide a coherent, comprehensive answer to the original query
            2. Synthesize information from multiple sub-query results
            3. Highlight key findings and patterns
            4. Include confidence assessment
            5. Suggest follow-up actions if appropriate
            
            Format as a natural, helpful response.
            `;
            
            const response = await llmClient.analyzeQueryIntent(synthesisPrompt);
            
            return {
                response: response,
                confidence: 0.8,
                synthesis_method: 'llm_powered',
                aggregateStats: aggregatedResults.aggregateStats
            };
            
        } catch (error) {
            logger.error(`Error in LLM synthesis: ${error.message}`);
            
            // Fallback synthesis
            const { aggregateStats } = aggregatedResults;
            const successRate = (aggregateStats.successfulQueries / aggregateStats.totalQueries * 100).toFixed(1);
            
            return {
                response: `I processed your complex query by breaking it down into ${aggregateStats.totalQueries} sub-queries. ${aggregateStats.successfulQueries} were successful (${successRate}% success rate), executing ${aggregateStats.totalToolsExecuted} tools and analyzing ${aggregateStats.totalIncidents} incidents. The results provide comprehensive insights into your request.`,
                confidence: 0.7,
                synthesis_method: 'template_based',
                aggregateStats: aggregateStats
            };
        }
    }

    /**
     * Update performance metrics
     * @param {Object} contextData - Final context data
     */
    _updatePerformanceMetrics(contextData) {
        this.performanceMetrics.totalQueries += contextData.executionResults?.length || 0;
        this.performanceMetrics.successfulQueries += contextData.executionResults?.filter(r => r.success).length || 0;
        
        // Update average execution time
        if (contextData.finalResponse?.executionTime) {
            const currentAvg = this.performanceMetrics.averageExecutionTime;
            const newTime = contextData.finalResponse.executionTime;
            this.performanceMetrics.averageExecutionTime = (currentAvg + newTime) / 2;
        }
    }

    /**
     * Format the final enhanced workflow response
     * @param {Object} contextData - Final context data
     * @returns {Object} Formatted response
     */
    _formatEnhancedWorkflowResponse(contextData) {
        const success = contextData.finalResponse && !contextData.error;
        
        return {
            success: success,
            response: contextData.finalResponse?.response || 'Complex query processing completed',
            original_query: contextData.originalQuery,
            sub_queries: contextData.subQueries || [],
            execution_plan: {
                strategy: contextData.executionPlan?.strategy || 'unknown',
                batches: contextData.executionPlan?.batches?.length || 0,
                total_queries: contextData.executionResults?.length || 0
            },
            execution_summary: {
                successful_queries: contextData.executionResults?.filter(r => r.success).length || 0,
                failed_queries: contextData.executionResults?.filter(r => !r.success).length || 0,
                success_rate: contextData.aggregatedResults?.aggregateStats?.overallSuccessRate || 0,
                execution_time: contextData.finalResponse?.executionTime || 0
            },
            aggregated_data: contextData.aggregatedResults?.aggregatedData || {},
            session_info: {
                session_id: contextData.sessionId,
                timestamp: contextData.finalResponse?.timestamp
            },
            performance_insights: {
                decomposition_confidence: contextData.subQueries?.length > 1 ? 0.8 : 0.9,
                execution_efficiency: this._calculateExecutionEfficiency(contextData),
                synthesis_method: contextData.finalResponse?.synthesis_method || 'standard'
            }
        };
    }

    /**
     * Calculate execution efficiency score
     * @param {Object} contextData - Context data
     * @returns {number} Efficiency score (0-1)
     */
    _calculateExecutionEfficiency(contextData) {
        if (!contextData.executionResults || contextData.executionResults.length === 0) {
            return 0.0;
        }
        
        const successRate = contextData.aggregatedResults?.aggregateStats?.overallSuccessRate || 0;
        const executionTime = contextData.finalResponse?.executionTime || 0;
        
        // Higher efficiency for higher success rates and lower execution times
        // Normalize execution time (assume 30 seconds as baseline)
        const timeEfficiency = Math.max(0, 1 - (executionTime / 30000));
        
        return (successRate * 0.7) + (timeEfficiency * 0.3);
    }

    /**
     * Get enhanced workflow status and metrics
     * @returns {Object} Enhanced workflow status
     */
    getEnhancedWorkflowStatus() {
        return {
            workflow_name: 'Enhanced LangGraph MCP Orchestrator',
            version: '1.0.0',
            active_enhanced_workflows: this.activeEnhancedWorkflows.size,
            performance_metrics: this.performanceMetrics,
            capabilities: [
                'multi_query_decomposition',
                'parallel_execution',
                'sequential_execution',
                'result_aggregation',
                'intelligent_synthesis'
            ],
            base_workflow_status: this.baseWorkflow.getWorkflowStatus()
        };
    }

    /**
     * Get status of a specific enhanced workflow session
     * @param {string} sessionId - Session ID
     * @returns {Object|null} Enhanced session status
     */
    getEnhancedSessionStatus(sessionId) {
        const workflow = this.activeEnhancedWorkflows.get(sessionId);
        if (!workflow) {
            return null;
        }
        
        return {
            session_id: sessionId,
            current_state: workflow.getSnapshot().value,
            context: workflow.getSnapshot().context,
            workflow_type: 'enhanced'
        };
    }

    /**
     * Stop a specific enhanced workflow session
     * @param {string} sessionId - Session ID
     */
    stopEnhancedSession(sessionId) {
        const workflow = this.activeEnhancedWorkflows.get(sessionId);
        if (workflow) {
            workflow.stop();
            this.activeEnhancedWorkflows.delete(sessionId);
            logger.info(`🛑 Stopped enhanced workflow session: ${sessionId}`);
        }
    }
}

export default EnhancedLangGraphWorkflow;