/**
 * Tool Execution Agent - Executes MCP tools and manages the execution workflow
 */

import winston from 'winston';
import { addMCPResult, updateStateContext } from '../state.js';

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
 * Specialized agent for executing MCP tools in the correct sequence
 * and managing the execution workflow with error handling and retries
 */
class ToolExecutionAgent {
    constructor(mcpClient) {
        this.name = 'ToolExecutionAgent';
        this.mcpClient = mcpClient;
        
        // Tool execution configuration
        this.executionConfig = {
            maxRetries: 3,
            retryDelay: 1000, // 1 second
            timeoutPerTool: 30000, // 30 seconds
            parallelExecution: true,
            maxParallelTools: 3
        };
        
        // Tool dependency mapping
        this.toolDependencies = {
            'get_incident_changelogs': ['get_incident_by_id'],
            'get_resource_tickets': ['get_resource_by_id'],
            'search_changelogs_by_resource_id': ['get_resource_by_id']
        };
    }

    /**
     * Main tool execution orchestration
     * @param {Object} state - Current chat state
     * @returns {Promise<Object>} Updated state with execution results
     */
    async executeTools(state) {
        try {
            logger.info(`🛠️ Executing ${state.tool_sequence?.length || 0} tools`);
            
            // Plan execution order considering dependencies
            const executionPlan = this._createExecutionPlan(state.tool_sequence || [], state);
            
            // Execute tools according to plan
            const results = [];
            let currentState = state;
            
            for (const executionBatch of executionPlan) {
                const batchResults = await this._executeToolBatch(executionBatch, currentState);
                
                // Add results to state
                for (const [toolName, result] of Object.entries(batchResults)) {
                    currentState = addMCPResult(currentState, toolName, result, this.name);
                }
                
                results.push(...Object.values(batchResults));
                
                // Update context for next batch
                currentState = this._updateExecutionContext(currentState, batchResults);
            }
            
            // Calculate execution statistics
            const executionStats = this._calculateExecutionStats(results);
            currentState = updateStateContext(currentState, 'execution_stats', executionStats);
            
            logger.info(`✅ Tool execution completed: ${(executionStats.success_rate * 100).toFixed(1)}% success rate`);
            
            return currentState;
            
        } catch (error) {
            logger.error(`❌ Tool execution failed: ${error.message}`);
            return {
                ...state,
                error_count: (state.error_count || 0) + 1,
                workflow_status: 'degraded',
                execution_error: error.message
            };
        }
    }

    /**
     * Create execution plan considering dependencies and context
     * @param {string[]} toolSequence - List of tools to execute
     * @param {Object} state - Current state
     * @returns {Array<Array<Object>>} Execution plan as batches
     */
    _createExecutionPlan(toolSequence, state) {
        const executionPlan = [];
        const remainingTools = [...toolSequence];
        const context = state.context_data || {};
        
        while (remainingTools.length > 0) {
            // Find tools that can be executed in this batch
            const executableTools = [];
            
            for (const tool of remainingTools) {
                if (this._canExecuteTool(tool, state, [])) {
                    // Build tool execution info
                    const toolInfo = {
                        name: tool,
                        parameters: this._buildToolParameters(tool, context),
                        priority: this._getToolPriority(tool, state),
                        timeout: this.executionConfig.timeoutPerTool
                    };
                    executableTools.push(toolInfo);
                }
            }
            
            if (executableTools.length === 0) {
                // Break dependency deadlock by executing remaining tools anyway
                logger.warn('⚠️ Dependency deadlock detected, executing remaining tools');
                for (const tool of remainingTools) {
                    executableTools.push({
                        name: tool,
                        parameters: this._buildToolParameters(tool, context),
                        priority: 1,
                        timeout: this.executionConfig.timeoutPerTool
                    });
                }
            }
            
            // Sort by priority and limit batch size
            executableTools.sort((a, b) => b.priority - a.priority);
            const batch = executableTools.slice(0, this.executionConfig.maxParallelTools);
            
            executionPlan.push(batch);
            
            // Remove executed tools from remaining
            const executedInBatch = batch.map(tool => tool.name);
            remainingTools.splice(0, remainingTools.length, 
                ...remainingTools.filter(tool => !executedInBatch.includes(tool))
            );
        }
        
        return executionPlan;
    }

    /**
     * Execute a batch of tools in parallel or sequential
     * @param {Array<Object>} toolBatch - Batch of tools to execute
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Batch results
     */
    async _executeToolBatch(toolBatch, state) {
        const batchResults = {};
        
        if (this.executionConfig.parallelExecution && toolBatch.length > 1) {
            // Parallel execution
            const tasks = toolBatch.map(async (toolInfo) => {
                try {
                    const result = await this._executeSingleToolWithRetry(toolInfo, state);
                    return { name: toolInfo.name, result };
                } catch (error) {
                    logger.error(`❌ Tool ${toolInfo.name} failed in batch: ${error.message}`);
                    return { 
                        name: toolInfo.name, 
                        result: { error: error.message, success: false } 
                    };
                }
            });
            
            // Wait for all tasks to complete
            const taskResults = await Promise.all(tasks);
            for (const { name, result } of taskResults) {
                batchResults[name] = result;
            }
        } else {
            // Sequential execution
            for (const toolInfo of toolBatch) {
                try {
                    const result = await this._executeSingleToolWithRetry(toolInfo, state);
                    batchResults[toolInfo.name] = result;
                } catch (error) {
                    logger.error(`❌ Tool ${toolInfo.name} failed: ${error.message}`);
                    batchResults[toolInfo.name] = { error: error.message, success: false };
                }
            }
        }
        
        return batchResults;
    }

    /**
     * Execute a single tool with retry logic
     * @param {Object} toolInfo - Tool information
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Execution result
     */
    async _executeSingleToolWithRetry(toolInfo, state) {
        const toolName = toolInfo.name;
        const parameters = toolInfo.parameters;
        const maxRetries = this.executionConfig.maxRetries;
        const retryDelay = this.executionConfig.retryDelay;
        
        let lastError = null;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    logger.info(`🔄 Retrying ${toolName} (attempt ${attempt + 1}/${maxRetries + 1})`);
                    await this._sleep(retryDelay * attempt); // Exponential backoff
                }
                
                // Execute the tool with timeout
                const result = await Promise.race([
                    this.mcpClient.executeTool(toolName, parameters),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Tool execution timeout')), toolInfo.timeout)
                    )
                ]);
                
                logger.info(`✅ Tool ${toolName} executed successfully`);
                return { success: true, data: result, attempts: attempt + 1 };
                
            } catch (error) {
                lastError = error.message;
                if (error.message.includes('timeout')) {
                    logger.warn(`⏰ Tool ${toolName} timed out on attempt ${attempt + 1}`);
                } else {
                    logger.warn(`⚠️ Tool ${toolName} failed on attempt ${attempt + 1}: ${error.message}`);
                }
            }
        }
        
        // All retries failed
        logger.error(`❌ Tool ${toolName} failed after ${maxRetries + 1} attempts: ${lastError}`);
        return { success: false, error: lastError, attempts: maxRetries + 1 };
    }

    /**
     * Check if a tool can be executed based on dependencies
     * @param {string} toolName - Tool name
     * @param {Object} state - Current state
     * @param {string[]} executedTools - Already executed tools
     * @returns {boolean} Can execute
     */
    _canExecuteTool(toolName, state, executedTools) {
        const dependencies = this.toolDependencies[toolName] || [];
        
        for (const dependency of dependencies) {
            if (!executedTools.includes(dependency) && 
                !(state.executed_tools || []).includes(dependency)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Build parameters for tool execution based on context
     * @param {string} toolName - Tool name
     * @param {Object} context - Execution context
     * @returns {Object} Tool parameters
     */
    _buildToolParameters(toolName, context) {
        const params = {};
        
        // Tool-specific parameter building
        switch (toolName) {
            case 'search_logs':
                if (context.error_timestamp) {
                    params.query = `level:ERROR AND _time:${context.error_timestamp}`;
                } else {
                    params.query = 'level:ERROR';
                }
                params.limit = 50;
                break;
                
            case 'get_incidents':
                params.status = 'open';
                params.limit = 20;
                break;
                
            case 'search_changelogs':
                if (context.resource_id) {
                    params.resource_id = context.resource_id;
                }
                params.limit = 30;
                break;
                
            case 'get_incident_by_id':
                if (context.incident_id) {
                    params.incident_id = context.incident_id;
                }
                break;
                
            case 'get_resource_by_id':
                if (context.resource_id) {
                    params.resource_id = context.resource_id;
                }
                break;
                
            case 'get_schema':
            case 'get_node_labels':
                // These tools don't need parameters
                break;
                
            default:
                // Default empty parameters
                break;
        }
        
        return params;
    }

    /**
     * Determine execution priority for tools
     * @param {string} toolName - Tool name
     * @param {Object} state - Current state
     * @returns {number} Priority (higher = more priority)
     */
    _getToolPriority(toolName, state) {
        const queryType = state.query_type || 'general';
        
        // High priority tools for incident analysis
        if (queryType === 'incident_analysis') {
            const highPriorityTools = ['search_logs', 'get_incidents', 'search_changelogs'];
            if (highPriorityTools.includes(toolName)) {
                return 3;
            }
        }
        
        // Medium priority for supporting tools
        const supportingTools = ['get_resource_by_id', 'get_incident_changelogs'];
        if (supportingTools.includes(toolName)) {
            return 2;
        }
        
        // Low priority for exploratory tools
        return 1;
    }

    /**
     * Update execution context based on batch results
     * @param {Object} state - Current state
     * @param {Object} batchResults - Results from batch execution
     * @returns {Object} Updated state
     */
    _updateExecutionContext(state, batchResults) {
        const context = { ...(state.context_data || {}) };
        
        // Extract useful data from results for next batch
        for (const [toolName, result] of Object.entries(batchResults)) {
            if (result.success && result.data) {
                const data = result.data;
                
                // Extract resource IDs
                if (toolName === 'get_incidents' && typeof data === 'object' && data.incidents) {
                    const incidents = data.incidents;
                    if (Array.isArray(incidents) && incidents.length > 0) {
                        for (const incident of incidents.slice(0, 3)) { // Take first 3
                            if (typeof incident === 'object' && incident.resource_id) {
                                context.resource_id = incident.resource_id;
                                break;
                            }
                        }
                    }
                }
                
                // Extract incident IDs
                if (data.incident && typeof data.incident === 'object' && data.incident.id) {
                    context.incident_id = data.incident.id;
                }
                
                // Extract timestamps
                if (data.timestamp) {
                    context.error_timestamp = data.timestamp;
                }
            }
        }
        
        return updateStateContext(state, 'execution_context', context);
    }

    /**
     * Calculate execution statistics
     * @param {Array<Object>} results - Execution results
     * @returns {Object} Statistics
     */
    _calculateExecutionStats(results) {
        const totalTools = results.length;
        const successfulTools = results.filter(result => result.success).length;
        
        return {
            total_tools: totalTools,
            successful_tools: successfulTools,
            failed_tools: totalTools - successfulTools,
            success_rate: totalTools > 0 ? successfulTools / totalTools : 0,
            total_attempts: results.reduce((sum, result) => sum + (result.attempts || 1), 0),
            average_attempts: totalTools > 0 
                ? results.reduce((sum, result) => sum + (result.attempts || 1), 0) / totalTools 
                : 0
        };
    }

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    async _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default ToolExecutionAgent;