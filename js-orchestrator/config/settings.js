/**
 * Configuration settings for the JavaScript LangGraph Orchestrator
 * Converted from Python settings.py with environment variable support
 */

import { config } from 'dotenv';

// Load environment variables from .env file
config();

/**
 * Application configuration with environment variables and defaults
 */
export const settings = {
    // Server configuration
    server: {
        host: process.env.HOST || '0.0.0.0',
        port: parseInt(process.env.PORT) || 8000,
        environment: process.env.NODE_ENV || 'development',
        debug: process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development'
    },
    
    // OpenAI/LLM configuration
    llm: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.LLM_MODEL || 'gpt-4',
        temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.7,
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS) || 2000,
        timeout: parseInt(process.env.LLM_TIMEOUT) || 30000,
        maxRetries: parseInt(process.env.LLM_MAX_RETRIES) || 3,
        retryDelay: parseInt(process.env.LLM_RETRY_DELAY) || 1000
    },
    
    // MCP Server configuration
    mcp: {
        baseUrl: process.env.MCP_SERVER_URL || 'http://localhost:3001',
        timeout: parseInt(process.env.MCP_TIMEOUT) || 30000,
        maxRetries: parseInt(process.env.MCP_MAX_RETRIES) || 3,
        retryDelay: parseInt(process.env.MCP_RETRY_DELAY) || 1000,
        maxConnections: parseInt(process.env.MCP_MAX_CONNECTIONS) || 10,
        healthCheckInterval: parseInt(process.env.MCP_HEALTH_CHECK_INTERVAL) || 30000
    },
    
    // Rate limiting configuration
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
        skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
        skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'true'
    },
    
    // CORS configuration
    cors: {
        origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true
    },
    
    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json',
        enableConsole: process.env.LOG_CONSOLE !== 'false',
        enableFile: process.env.LOG_FILE === 'true',
        logDirectory: process.env.LOG_DIRECTORY || 'logs',
        maxFileSize: process.env.LOG_MAX_FILE_SIZE || '20m',
        maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5
    },
    
    // Security configuration
    security: {
        enableHelmet: process.env.SECURITY_HELMET !== 'false',
        enableCsp: process.env.SECURITY_CSP !== 'false',
        trustedProxies: process.env.TRUSTED_PROXIES ? process.env.TRUSTED_PROXIES.split(',') : [],
        sessionSecret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production'
    },
    
    // Workflow configuration
    workflow: {
        maxParallelQueries: parseInt(process.env.WORKFLOW_MAX_PARALLEL_QUERIES) || 3,
        queryTimeout: parseInt(process.env.WORKFLOW_QUERY_TIMEOUT) || 120000, // 2 minutes
        maxInvestigationDepth: parseInt(process.env.WORKFLOW_MAX_INVESTIGATION_DEPTH) || 3,
        enableEnhancedWorkflow: process.env.WORKFLOW_ENABLE_ENHANCED !== 'false',
        enableMetrics: process.env.WORKFLOW_ENABLE_METRICS !== 'false'
    },
    
    // Performance configuration
    performance: {
        maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
        keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT) || 5000,
        headersTimeout: parseInt(process.env.HEADERS_TIMEOUT) || 60000,
        enableCompression: process.env.ENABLE_COMPRESSION !== 'false',
        compressionLevel: parseInt(process.env.COMPRESSION_LEVEL) || 6
    }
};

/**
 * Validate required configuration values
 */
export function validateConfiguration() {
    const requiredSettings = [];
    
    const errors = [];
    
    // Warn about missing OpenAI API key but don't fail
    if (!settings.llm.apiKey) {
        console.warn('⚠️  Warning: OPENAI_API_KEY not set - LLM features will use fallback logic');
    }
    
    for (const [path, message] of requiredSettings) {
        const value = getNestedValue(settings, path);
        if (!value) {
            errors.push(message);
        }
    }
    
    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
}

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Object to search
 * @param {string} path - Dot notation path
 * @returns {any} Value at path
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Get configuration for specific environment
 * @param {string} environment - Environment name
 * @returns {Object} Environment-specific configuration
 */
export function getEnvironmentConfig(environment = settings.server.environment) {
    const envConfigs = {
        development: {
            logging: {
                ...settings.logging,
                level: 'debug',
                enableConsole: true
            },
            security: {
                ...settings.security,
                enableCsp: false // Easier development
            }
        },
        
        production: {
            logging: {
                ...settings.logging,
                level: 'warn',
                enableFile: true
            },
            security: {
                ...settings.security,
                enableCsp: true,
                enableHelmet: true
            },
            performance: {
                ...settings.performance,
                enableCompression: true
            }
        },
        
        test: {
            logging: {
                ...settings.logging,
                level: 'error',
                enableConsole: false,
                enableFile: false
            },
            mcp: {
                ...settings.mcp,
                baseUrl: 'http://localhost:3002' // Test MCP server
            }
        }
    };
    
    return {
        ...settings,
        ...envConfigs[environment]
    };
}

/**
 * Configuration summary for logging/debugging
 * @returns {Object} Configuration summary (without sensitive data)
 */
export function getConfigSummary() {
    return {
        server: {
            host: settings.server.host,
            port: settings.server.port,
            environment: settings.server.environment,
            debug: settings.server.debug
        },
        llm: {
            model: settings.llm.model,
            temperature: settings.llm.temperature,
            maxTokens: settings.llm.maxTokens,
            apiKeySet: !!settings.llm.apiKey
        },
        mcp: {
            baseUrl: settings.mcp.baseUrl,
            timeout: settings.mcp.timeout,
            maxRetries: settings.mcp.maxRetries
        },
        workflow: settings.workflow,
        logging: {
            level: settings.logging.level,
            enableConsole: settings.logging.enableConsole,
            enableFile: settings.logging.enableFile
        }
    };
}

// Default export
export default settings;