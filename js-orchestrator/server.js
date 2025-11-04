/**
 * Express.js Server for LangGraph MCP Orchestrator
 * Converted from Python FastAPI server with all endpoints and middleware
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import LangGraphWorkflow from './workflow.js';
import EnhancedLangGraphWorkflow from './enhanced_workflow.js';
import { MCPClientManager } from './utils/mcp_client.js';
import { createInitialState } from './state.js';
import { settings, validateConfiguration } from './config/settings.js';

// Configure logger - will be initialized after settings import
let logger;

/**
 * Express.js server for the LangGraph MCP Orchestrator
 */
class OrchestrationServer {
    constructor() {
        // Validate configuration before starting
        validateConfiguration();
        
        // Initialize logger with settings
        this._initializeLogger();
        
        this.app = express();
        this.port = settings.server.port;
        this.host = settings.server.host;
        
        // Initialize MCP client manager
        this.mcpClientManager = new MCPClientManager({
            baseUrl: settings.mcp.baseUrl,
            timeout: settings.mcp.timeout,
            maxRetries: settings.mcp.maxRetries
        });
        
        // Initialize workflows
        this.workflow = null;
        this.enhancedWorkflow = null;
        
        // Server metrics
        this.serverMetrics = {
            startTime: Date.now(),
            requestCount: 0,
            errorCount: 0,
            activeConnections: 0
        };
        
        this._setupMiddleware();
        this._setupRoutes();
        this._setupErrorHandling();
    }

    /**
     * Initialize Winston logger with configuration
     */
    _initializeLogger() {
        const transports = [];
        
        // Console transport
        if (settings.logging.enableConsole) {
            transports.push(new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            }));
        }
        
        // File transports
        if (settings.logging.enableFile) {
            transports.push(
                new winston.transports.File({ 
                    filename: `${settings.logging.logDirectory}/error.log`, 
                    level: 'error',
                    maxsize: settings.logging.maxFileSize,
                    maxFiles: settings.logging.maxFiles
                }),
                new winston.transports.File({ 
                    filename: `${settings.logging.logDirectory}/combined.log`,
                    maxsize: settings.logging.maxFileSize,
                    maxFiles: settings.logging.maxFiles
                })
            );
        }
        
        logger = winston.createLogger({
            level: settings.logging.level,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                settings.logging.format === 'json' ? winston.format.json() : winston.format.simple()
            ),
            transports: transports
        });
    }

    /**
     * Setup Express middleware
     */
    _setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                }
            }
        }));
        
        // CORS configuration
        this.app.use(cors({
            origin: settings.cors.origins,
            methods: settings.cors.methods,
            allowedHeaders: settings.cors.allowedHeaders,
            credentials: settings.cors.credentials
        }));
        
        // Rate limiting
        const limiter = rateLimit({
            windowMs: settings.rateLimit.windowMs,
            max: settings.rateLimit.max,
            message: {
                error: 'Too many requests from this IP, please try again later.',
                retryAfter: Math.ceil(settings.rateLimit.windowMs / 60000) + ' minutes'
            },
            standardHeaders: true,
            legacyHeaders: false,
            skipSuccessfulRequests: settings.rateLimit.skipSuccessfulRequests,
            skipFailedRequests: settings.rateLimit.skipFailedRequests
        });
        this.app.use(limiter);
        
        // Body parsing
        this.app.use(express.json({ limit: settings.performance.maxRequestSize }));
        this.app.use(express.urlencoded({ extended: true, limit: settings.performance.maxRequestSize }));
        
        // Request logging and metrics
        this.app.use((req, res, next) => {
            req.requestId = uuidv4();
            req.startTime = Date.now();
            
            logger.info(`📥 ${req.method} ${req.path}`, {
                requestId: req.requestId,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            this.serverMetrics.requestCount++;
            this.serverMetrics.activeConnections++;
            
            // Response logging
            res.on('finish', () => {
                const duration = Date.now() - req.startTime;
                this.serverMetrics.activeConnections--;
                
                logger.info(`📤 ${req.method} ${req.path} - ${res.statusCode}`, {
                    requestId: req.requestId,
                    duration: `${duration}ms`,
                    statusCode: res.statusCode
                });
                
                if (res.statusCode >= 400) {
                    this.serverMetrics.errorCount++;
                }
            });
            
            next();
        });
    }

    /**
     * Setup Express routes
     */
    _setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            const uptime = Date.now() - this.serverMetrics.startTime;
            
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: uptime,
                version: '1.0.0',
                mcp_connection: this.mcpClientManager ? 'available' : 'unavailable'
            });
        });
        
        // Server status and metrics
        this.app.get('/status', (req, res) => {
            const uptime = Date.now() - this.serverMetrics.startTime;
            
            res.json({
                server: {
                    status: 'running',
                    uptime: uptime,
                    version: '1.0.0',
                    environment: process.env.NODE_ENV || 'development'
                },
                metrics: this.serverMetrics,
                workflows: {
                    basic: this.workflow ? this.workflow.getWorkflowStatus() : null,
                    enhanced: this.enhancedWorkflow ? this.enhancedWorkflow.getEnhancedWorkflowStatus() : null
                },
                mcp_client: this.mcpClientManager ? this.mcpClientManager.getConnectionStats() : null
            });
        });
        
        // Main chat endpoint - basic workflow
        this.app.post('/chat', async (req, res) => {
            try {
                const { query, session_id } = req.body;
                
                if (!query || typeof query !== 'string') {
                    return res.status(400).json({
                        error: 'Missing or invalid query parameter',
                        details: 'Query must be a non-empty string'
                    });
                }
                
                logger.info(`💬 Processing chat query: "${query}"`, {
                    requestId: req.requestId,
                    sessionId: session_id
                });
                
                // Ensure workflow is initialized
                await this._ensureWorkflowInitialized();
                
                // Process the query
                const result = await this.workflow.processQuery(query, session_id);
                
                logger.info(`✅ Chat query completed successfully`, {
                    requestId: req.requestId,
                    sessionId: result.session_info?.session_id,
                    success: result.success
                });
                
                res.json(result);
                
            } catch (error) {
                logger.error(`❌ Error in /chat endpoint: ${error.message}`, {
                    requestId: req.requestId,
                    error: error.stack
                });
                
                res.status(500).json({
                    error: 'Internal server error',
                    message: error.message,
                    requestId: req.requestId
                });
            }
        });
        
        // Enhanced chat endpoint - multi-query workflow
        this.app.post('/chat/enhanced', async (req, res) => {
            try {
                const { query, session_id } = req.body;
                
                if (!query || typeof query !== 'string') {
                    return res.status(400).json({
                        error: 'Missing or invalid query parameter',
                        details: 'Query must be a non-empty string'
                    });
                }
                
                logger.info(`🚀 Processing enhanced chat query: "${query}"`, {
                    requestId: req.requestId,
                    sessionId: session_id
                });
                
                // Ensure enhanced workflow is initialized
                await this._ensureEnhancedWorkflowInitialized();
                
                // Process the complex query
                const result = await this.enhancedWorkflow.processComplexQuery(query, session_id);
                
                logger.info(`✅ Enhanced chat query completed successfully`, {
                    requestId: req.requestId,
                    sessionId: result.session_info?.session_id,
                    success: result.success
                });
                
                res.json(result);
                
            } catch (error) {
                logger.error(`❌ Error in /chat/enhanced endpoint: ${error.message}`, {
                    requestId: req.requestId,
                    error: error.stack
                });
                
                res.status(500).json({
                    error: 'Internal server error',
                    message: error.message,
                    requestId: req.requestId
                });
            }
        });
        
        // Workflow status endpoint
        this.app.get('/workflow/status', async (req, res) => {
            try {
                await this._ensureWorkflowInitialized();
                
                const status = {
                    basic_workflow: this.workflow.getWorkflowStatus(),
                    enhanced_workflow: this.enhancedWorkflow ? this.enhancedWorkflow.getEnhancedWorkflowStatus() : null
                };
                
                res.json(status);
                
            } catch (error) {
                logger.error(`❌ Error in /workflow/status endpoint: ${error.message}`, {
                    requestId: req.requestId,
                    error: error.stack
                });
                
                res.status(500).json({
                    error: 'Internal server error',
                    message: error.message,
                    requestId: req.requestId
                });
            }
        });
        
        // Session management endpoints
        this.app.get('/session/:session_id', async (req, res) => {
            try {
                const { session_id } = req.params;
                
                await this._ensureWorkflowInitialized();
                
                // Check both basic and enhanced workflows
                let sessionStatus = this.workflow.getSessionStatus(session_id);
                if (!sessionStatus && this.enhancedWorkflow) {
                    sessionStatus = this.enhancedWorkflow.getEnhancedSessionStatus(session_id);
                }
                
                if (!sessionStatus) {
                    return res.status(404).json({
                        error: 'Session not found',
                        session_id: session_id
                    });
                }
                
                res.json(sessionStatus);
                
            } catch (error) {
                logger.error(`❌ Error in /session/:session_id endpoint: ${error.message}`, {
                    requestId: req.requestId,
                    error: error.stack
                });
                
                res.status(500).json({
                    error: 'Internal server error',
                    message: error.message,
                    requestId: req.requestId
                });
            }
        });
        
        this.app.delete('/session/:session_id', async (req, res) => {
            try {
                const { session_id } = req.params;
                
                await this._ensureWorkflowInitialized();
                
                // Stop session in both workflows
                this.workflow.stopSession(session_id);
                if (this.enhancedWorkflow) {
                    this.enhancedWorkflow.stopEnhancedSession(session_id);
                }
                
                logger.info(`🛑 Stopped session: ${session_id}`, {
                    requestId: req.requestId
                });
                
                res.json({
                    message: 'Session stopped successfully',
                    session_id: session_id
                });
                
            } catch (error) {
                logger.error(`❌ Error in DELETE /session/:session_id endpoint: ${error.message}`, {
                    requestId: req.requestId,
                    error: error.stack
                });
                
                res.status(500).json({
                    error: 'Internal server error',
                    message: error.message,
                    requestId: req.requestId
                });
            }
        });
        
        // MCP server health check
        this.app.get('/mcp/health', async (req, res) => {
            try {
                const healthCheck = await this.mcpClientManager.healthCheck();
                res.json(healthCheck);
                
            } catch (error) {
                logger.error(`❌ Error in /mcp/health endpoint: ${error.message}`, {
                    requestId: req.requestId,
                    error: error.stack
                });
                
                res.status(500).json({
                    error: 'MCP health check failed',
                    message: error.message,
                    requestId: req.requestId
                });
            }
        });
        
        // Available MCP tools
        this.app.get('/mcp/tools', async (req, res) => {
            try {
                const client = await this.mcpClientManager.getClient();
                const tools = await client.listTools();
                
                res.json({
                    tools: tools,
                    count: tools.length,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                logger.error(`❌ Error in /mcp/tools endpoint: ${error.message}`, {
                    requestId: req.requestId,
                    error: error.stack
                });
                
                res.status(500).json({
                    error: 'Failed to fetch MCP tools',
                    message: error.message,
                    requestId: req.requestId
                });
            }
        });
        
        // Test endpoint for development
        this.app.post('/test', async (req, res) => {
            try {
                const { test_type = 'basic', ...params } = req.body;
                
                logger.info(`🧪 Running test: ${test_type}`, {
                    requestId: req.requestId,
                    params: params
                });
                
                let result;
                
                switch (test_type) {
                    case 'mcp_connection':
                        result = await this.mcpClientManager.healthCheck();
                        break;
                        
                    case 'workflow_init':
                        await this._ensureWorkflowInitialized();
                        result = {
                            message: 'Workflow initialized successfully',
                            status: this.workflow.getWorkflowStatus()
                        };
                        break;
                        
                    case 'state_creation':
                        result = createInitialState('Test query for state creation');
                        break;
                        
                    default:
                        result = {
                            message: 'Test completed successfully',
                            server_status: 'healthy',
                            timestamp: new Date().toISOString()
                        };
                }
                
                res.json({
                    test_type: test_type,
                    result: result,
                    success: true
                });
                
            } catch (error) {
                logger.error(`❌ Error in /test endpoint: ${error.message}`, {
                    requestId: req.requestId,
                    error: error.stack
                });
                
                res.status(500).json({
                    error: 'Test failed',
                    message: error.message,
                    requestId: req.requestId
                });
            }
        });
        
        // Catch-all route for undefined endpoints
        this.app.use('*', (req, res) => {
            logger.warn(`🚫 Undefined route accessed: ${req.method} ${req.originalUrl}`, {
                requestId: req.requestId,
                ip: req.ip
            });
            
            res.status(404).json({
                error: 'Route not found',
                message: `The route ${req.method} ${req.originalUrl} does not exist`,
                requestId: req.requestId
            });
        });
    }

    /**
     * Setup error handling middleware
     */
    _setupErrorHandling() {
        // Global error handler
        this.app.use((error, req, res, next) => {
            logger.error(`🔥 Unhandled error in Express app: ${error.message}`, {
                requestId: req.requestId,
                error: error.stack,
                url: req.originalUrl,
                method: req.method
            });
            
            this.serverMetrics.errorCount++;
            
            // Don't leak error details in production
            const isDevelopment = process.env.NODE_ENV === 'development';
            
            res.status(error.status || 500).json({
                error: 'Internal server error',
                message: isDevelopment ? error.message : 'An unexpected error occurred',
                requestId: req.requestId,
                ...(isDevelopment && { stack: error.stack })
            });
        });
    }

    /**
     * Ensure basic workflow is initialized
     */
    async _ensureWorkflowInitialized() {
        if (!this.workflow) {
            logger.info('🔄 Initializing basic workflow...');
            const client = await this.mcpClientManager.getClient();
            this.workflow = new LangGraphWorkflow(client);
            logger.info('✅ Basic workflow initialized');
        }
    }

    /**
     * Ensure enhanced workflow is initialized
     */
    async _ensureEnhancedWorkflowInitialized() {
        await this._ensureWorkflowInitialized(); // Ensure basic workflow first
        
        if (!this.enhancedWorkflow) {
            logger.info('🔄 Initializing enhanced workflow...');
            const client = await this.mcpClientManager.getClient();
            this.enhancedWorkflow = new EnhancedLangGraphWorkflow(client);
            logger.info('✅ Enhanced workflow initialized');
        }
    }

    /**
     * Start the Express server
     */
    async start() {
        try {
            // Initialize MCP client manager
            logger.info('🔄 Initializing MCP client manager...');
            await this.mcpClientManager.initialize();
            
            // Start server
            const server = this.app.listen(this.port, this.host, () => {
                logger.info(`🚀 Orchestration server started on ${this.host}:${this.port}`);
                logger.info(`🌐 Health check: http://${this.host}:${this.port}/health`);
                logger.info(`📊 Status endpoint: http://${this.host}:${this.port}/status`);
                logger.info(`💬 Chat endpoint: http://${this.host}:${this.port}/chat`);
                logger.info(`🚀 Enhanced chat: http://${this.host}:${this.port}/chat/enhanced`);
            });
            
            // Graceful shutdown handling
            process.on('SIGTERM', () => {
                logger.info('🛑 Received SIGTERM, starting graceful shutdown...');
                this._gracefulShutdown(server);
            });
            
            process.on('SIGINT', () => {
                logger.info('🛑 Received SIGINT, starting graceful shutdown...');
                this._gracefulShutdown(server);
            });
            
            return server;
            
        } catch (error) {
            logger.error(`❌ Failed to start server: ${error.message}`, {
                error: error.stack
            });
            throw error;
        }
    }

    /**
     * Graceful shutdown handler
     * @param {Object} server - Express server instance
     */
    _gracefulShutdown(server) {
        logger.info('🔄 Starting graceful shutdown...');
        
        server.close(() => {
            logger.info('📤 HTTP server closed');
            
            // Stop active workflows
            if (this.workflow) {
                // Stop all active sessions in basic workflow
                for (const sessionId of Object.keys(this.workflow.activeWorkflows || {})) {
                    this.workflow.stopSession(sessionId);
                }
            }
            
            if (this.enhancedWorkflow) {
                // Stop all active sessions in enhanced workflow
                for (const sessionId of Object.keys(this.enhancedWorkflow.activeEnhancedWorkflows || {})) {
                    this.enhancedWorkflow.stopEnhancedSession(sessionId);
                }
            }
            
            // Close MCP client connections
            if (this.mcpClientManager) {
                this.mcpClientManager.closeAll();
            }
            
            logger.info('✅ Graceful shutdown completed');
            process.exit(0);
        });
        
        // Force close after 10 seconds
        setTimeout(() => {
            logger.error('⚠️ Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    }
}

// Create and start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new OrchestrationServer();
    
    server.start().catch((error) => {
        logger.error(`❌ Failed to start server: ${error.message}`);
        process.exit(1);
    });
}

export default OrchestrationServer;