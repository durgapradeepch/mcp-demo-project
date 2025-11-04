/**
 * MCP Client - Communicates with the existing MCP server to execute tools
 * JavaScript implementation with HTTP client and error handling
 */

import axios from 'axios';
import winston from 'winston';

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
 * Custom exception for MCP client errors
 */
class MCPClientError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MCPClientError';
    }
}

/**
 * Client for communicating with the existing MCP server
 * Handles tool execution, error handling, and response processing
 */
class MCPClient {
    constructor(mcpServerUrl = 'http://localhost:3001') {
        this.mcpServerUrl = mcpServerUrl;
        this.session = null;
        
        // Client configuration
        this.config = {
            timeout: 30000,  // 30 seconds
            maxRetries: 3,
            retryDelay: 1000  // 1 second
        };
        
        // Tool endpoint mapping
        this.endpoints = {
            execute_tool: `${mcpServerUrl}/api/mcp/execute`,
            list_tools: `${mcpServerUrl}/api/mcp/tools`,
            health_check: `${mcpServerUrl}/api/mcp/tools`  // Use tools endpoint for health check
        };

        // Create axios instance with default config
        this.httpClient = axios.create({
            timeout: this.config.timeout,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Execute a single MCP tool with the given parameters
     * @param {string} toolName - Name of the tool to execute
     * @param {Object} parameters - Parameters for the tool
     * @returns {Promise<Object>} Tool execution result
     */
    async executeTool(toolName, parameters) {
        try {
            logger.info(`🔧 Executing MCP tool: ${toolName}`);
            
            // Prepare request payload
            const payload = {
                tool_name: toolName,
                parameters: parameters
            };
            
            // Execute with retry logic
            for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
                try {
                    const result = await this._makeRequest(
                        'POST',
                        this.endpoints.execute_tool,
                        payload
                    );
                    
                    logger.info(`✅ Tool ${toolName} executed successfully`);
                    return result;
                    
                } catch (error) {
                    if (attempt < this.config.maxRetries - 1) {
                        logger.warn(`⚠️ Tool ${toolName} attempt ${attempt + 1} failed: ${error.message}, retrying...`);
                        await this._sleep(this.config.retryDelay * (attempt + 1));
                    } else {
                        throw error;
                    }
                }
            }
            
        } catch (error) {
            logger.error(`❌ Tool ${toolName} execution failed: ${error.message}`);
            throw new MCPClientError(`Failed to execute tool ${toolName}: ${error.message}`);
        }
    }

    /**
     * Get list of available MCP tools from the server
     * @returns {Promise<Object>} Available tools information
     */
    async listAvailableTools() {
        try {
            logger.info('📋 Fetching available MCP tools');
            
            const result = await this._makeRequest('GET', this.endpoints.list_tools);
            
            logger.info(`✅ Retrieved ${result.tools?.length || 0} available tools`);
            return result;
            
        } catch (error) {
            logger.error(`❌ Failed to fetch tools list: ${error.message}`);
            throw new MCPClientError(`Failed to fetch tools list: ${error.message}`);
        }
    }

    /**
     * Check the health status of the MCP server
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        try {
            const result = await this._makeRequest('GET', this.endpoints.health_check);
            return {
                status: 'healthy',
                server_response: result
            };
        } catch (error) {
            logger.warn(`⚠️ MCP server health check failed: ${error.message}`);
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    /**
     * Execute multiple tools in parallel
     * @param {Array<Object>} toolRequests - Array of {tool_name, parameters} objects
     * @returns {Promise<Array<Object>>} Array of execution results
     */
    async executeMultipleTools(toolRequests) {
        logger.info(`🔧 Executing ${toolRequests.length} MCP tools in parallel`);
        
        const tasks = toolRequests.map(async (request) => {
            try {
                const result = await this.executeTool(request.tool_name, request.parameters);
                return {
                    tool_name: request.tool_name,
                    success: true,
                    result: result
                };
            } catch (error) {
                logger.error(`❌ Parallel execution failed for ${request.tool_name}: ${error.message}`);
                return {
                    tool_name: request.tool_name,
                    success: false,
                    error: error.message
                };
            }
        });
        
        const results = await Promise.all(tasks);
        
        const successfulCount = results.filter(r => r.success).length;
        logger.info(`✅ Parallel execution completed: ${successfulCount}/${results.length} tools successful`);
        
        return results;
    }

    /**
     * Make HTTP request to MCP server with error handling
     * @param {string} method - HTTP method
     * @param {string} url - Request URL
     * @param {Object} [data] - Request data
     * @returns {Promise<Object>} Response data
     */
    async _makeRequest(method, url, data = null) {
        try {
            const config = {
                method: method,
                url: url
            };

            if (data) {
                config.data = data;
            }

            const response = await this.httpClient(config);
            
            // Parse response
            const responseData = response.data;
            
            // Check for application-level errors
            if (typeof responseData === 'object' && responseData.success === false) {
                const errorMsg = responseData.error || 'Unknown error';
                throw new MCPClientError(`MCP server error: ${errorMsg}`);
            }
            
            return responseData;
            
        } catch (error) {
            if (error instanceof MCPClientError) {
                throw error;
            }
            
            if (error.code === 'ECONNABORTED') {
                throw new MCPClientError('Request timed out');
            }
            
            if (error.response) {
                // HTTP error response
                const status = error.response.status;
                const statusText = error.response.statusText;
                const errorText = error.response.data || statusText;
                throw new MCPClientError(`HTTP ${status}: ${errorText}`);
            }
            
            if (error.request) {
                // Network error
                throw new MCPClientError(`Network error: ${error.message}`);
            }
            
            throw new MCPClientError(`Unexpected error: ${error.message}`);
        }
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

/**
 * Manager for MCP client instances with connection pooling and monitoring
 */
class MCPClientManager {
    constructor(config = {}) {
        this.mcpServerUrl = config.baseUrl || 'http://localhost:3001';
        this.timeout = config.timeout || 30000;
        this.maxRetries = config.maxRetries || 3;
        this.clients = new Map();
        this.connectionStats = {
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            average_response_time: 0.0
        };
    }

    /**
     * Initialize the MCP client manager
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            logger.info('🔄 Testing MCP server connection...');
            
            // Create a test client and check health
            const testClient = new MCPClient(this.mcpServerUrl);
            const health = await testClient.healthCheck();
            
            if (health.status === 'healthy') {
                logger.info('✅ MCP server connection established');
            } else {
                logger.warn(`⚠️ MCP server health check returned: ${health.status}`);
            }
        } catch (error) {
            logger.warn(`⚠️ Could not connect to MCP server at ${this.mcpServerUrl}: ${error.message}`);
            logger.warn('🔄 Server will continue but MCP features may not work properly');
        }
    }

    /**
     * Get or create MCP client for a session
     * @param {string} [sessionId='default'] - Session identifier
     * @returns {Promise<MCPClient>} MCP client instance
     */
    async getClient(sessionId = 'default') {
        if (!this.clients.has(sessionId)) {
            const client = new MCPClient(this.mcpServerUrl);
            client.config.timeout = this.timeout;
            client.config.maxRetries = this.maxRetries;
            
            // Perform initial health check
            try {
                const health = await client.healthCheck();
                if (health.status !== 'healthy') {
                    logger.warn(`⚠️ MCP server health check failed for session ${sessionId}`);
                }
            } catch (error) {
                logger.warn(`⚠️ Could not perform health check for session ${sessionId}: ${error.message}`);
            }
            
            this.clients.set(sessionId, client);
        }
        
        return this.clients.get(sessionId);
    }

    /**
     * Execute tool through managed client with monitoring
     * @param {string} toolName - Tool to execute
     * @param {Object} parameters - Tool parameters
     * @param {string} [sessionId='default'] - Session ID
     * @returns {Promise<Object>} Execution result
     */
    async executeToolManaged(toolName, parameters, sessionId = 'default') {
        const startTime = Date.now();
        
        try {
            const client = await this.getClient(sessionId);
            const result = await client.executeTool(toolName, parameters);
            
            // Update stats
            this.connectionStats.total_requests++;
            this.connectionStats.successful_requests++;
            
            const executionTime = Date.now() - startTime;
            this._updateAverageResponseTime(executionTime);
            
            return result;
            
        } catch (error) {
            this.connectionStats.total_requests++;
            this.connectionStats.failed_requests++;
            throw error;
        }
    }

    /**
     * Clean up client session
     * @param {string} sessionId - Session to clean up
     */
    async cleanupSession(sessionId) {
        if (this.clients.has(sessionId)) {
            this.clients.delete(sessionId);
            logger.info(`🧹 Cleaned up MCP client session: ${sessionId}`);
        }
    }

    /**
     * Clean up all client sessions
     */
    async cleanupAllSessions() {
        for (const sessionId of this.clients.keys()) {
            await this.cleanupSession(sessionId);
        }
    }

    /**
     * Get connection statistics
     * @returns {Object} Connection stats
     */
    getConnectionStats() {
        const totalRequests = this.connectionStats.total_requests;
        const successRate = totalRequests > 0 
            ? this.connectionStats.successful_requests / totalRequests 
            : 0;
        
        return {
            ...this.connectionStats,
            success_rate: successRate,
            active_sessions: this.clients.size
        };
    }

    /**
     * Update average response time with new measurement
     * @param {number} executionTime - New execution time in ms
     */
    _updateAverageResponseTime(executionTime) {
        const currentAvg = this.connectionStats.average_response_time;
        const totalRequests = this.connectionStats.total_requests;
        
        // Calculate new average
        const newAvg = ((currentAvg * (totalRequests - 1)) + executionTime) / totalRequests;
        this.connectionStats.average_response_time = newAvg;
    }

    /**
     * Close all client connections
     */
    closeAll() {
        logger.info('🔌 Closing all MCP client connections');
        this.clients.clear();
    }
}

// Utility functions for MCP integration

/**
 * Test connectivity to MCP server
 * @param {string} [serverUrl='http://localhost:3001'] - MCP server URL
 * @returns {Promise<Object>} Connectivity test results
 */
export async function testMCPConnectivity(serverUrl = 'http://localhost:3001') {
    const client = new MCPClient(serverUrl);
    
    try {
        // Test health check
        const health = await client.healthCheck();
        
        // Test tools list
        const tools = await client.listAvailableTools();
        
        return {
            connectivity: 'successful',
            server_health: health,
            available_tools: tools.tools?.length || 0,
            tools_list: tools.tools || []
        };
        
    } catch (error) {
        return {
            connectivity: 'failed',
            error: error.message
        };
    }
}

/**
 * Validate that required tools are available on the MCP server
 * @param {string[]} requiredTools - List of required tool names
 * @param {string} [serverUrl='http://localhost:3001'] - MCP server URL
 * @returns {Promise<Object>} Validation results
 */
export async function validateToolAvailability(requiredTools, serverUrl = 'http://localhost:3001') {
    const client = new MCPClient(serverUrl);
    
    try {
        const toolsResponse = await client.listAvailableTools();
        const availableTools = (toolsResponse.tools || []).map(tool => tool.name || tool);
        
        const missingTools = requiredTools.filter(tool => !availableTools.includes(tool));
        
        return {
            validation: missingTools.length === 0 ? 'passed' : 'failed',
            required_tools: requiredTools,
            available_tools: availableTools,
            missing_tools: missingTools
        };
        
    } catch (error) {
        return {
            validation: 'error',
            error: error.message
        };
    }
}

// Export classes and functions
export { MCPClient, MCPClientManager, MCPClientError };
export default MCPClientManager;