/**
 * Query Analysis Agent - LLM-powered query analysis and strategy determination
 */

import winston from 'winston';
import { updateStateContext } from '../state.js';
import llmClient from '../utils/llm_client.js';

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
 * LLM-powered agent for analyzing user queries and determining:
 * - Query type and intent (using LLM)
 * - Entity extraction (using LLM)
 * - Investigation strategy (using LLM)
 * - Confidence scoring (using LLM)
 */
class QueryAnalysisAgent {
    constructor() {
        this.name = 'QueryAnalysisAgent';
        this.llm = llmClient;
    }

    /**
     * Main LLM-powered analysis method that replaces all hardcoded pattern matching
     * @param {Object} state - Current chat state
     * @param {string[]} [availableTools] - List of available tools
     * @returns {Promise<Object>} Updated state with analysis results
     */
    async analyzeQuery(state, availableTools = null) {
        try {
            logger.info(`🔍 LLM Analyzing query: '${state.user_query}'`);
            
            const userQuery = state.user_query;
            
            // If no tools provided, use a default set
            if (!availableTools) {
                availableTools = [
                    'search_logs', 'get_incidents', 'search_changelogs', 'get_resources',
                    'get_database_stats', 'get_schema', 'query_nodes', 'get_node_labels',
                    'get_incident_by_id', 'get_resource_by_id', 'search_resources'
                ];
            }
            
            // Use LLM for comprehensive query analysis
            const llmAnalysis = await this.llm.analyzeQueryIntent(userQuery, availableTools);
            
            // Update state with LLM analysis results
            const updatedState = {
                ...state,
                query_type: llmAnalysis.query_type || 'general',
                intent: llmAnalysis.intent || 'unknown',
                entities: llmAnalysis.entities || [],
                confidence_score: llmAnalysis.confidence_score || 0.5,
                specificity_level: llmAnalysis.specificity_level || 'medium',
                current_agent: this.name
            };
            
            // Add comprehensive analysis context
            const analysisContext = {
                llm_analysis: llmAnalysis,
                investigation_strategy: llmAnalysis.investigation_strategy || 'Standard approach',
                analysis_timestamp: new Date().toISOString(),
                available_tools_count: availableTools.length,
                analysis_method: 'LLM-powered'
            };
            
            const finalState = updateStateContext(updatedState, 'query_analysis', analysisContext);
            
            logger.info(`✅ LLM Query analysis complete: Type=${llmAnalysis.query_type}, Confidence=${llmAnalysis.confidence_score?.toFixed(2) || 'N/A'}`);
            
            return finalState;
            
        } catch (error) {
            logger.error(`❌ LLM Query analysis failed: ${error.message}`);
            // Fallback to basic analysis
            return await this._fallbackAnalysis(state);
        }
    }

    /**
     * Fallback analysis when LLM is unavailable
     * @param {Object} state - Current state
     * @returns {Promise<Object>} Updated state with fallback analysis
     */
    async _fallbackAnalysis(state) {
        logger.warn('🔄 Using fallback query analysis');
        
        const userQuery = state.user_query.toLowerCase();
        
        // Simple keyword-based classification
        let queryType, intent, confidence;
        
        if (['error', 'incident', 'problem', 'failure', 'outage'].some(word => userQuery.includes(word))) {
            queryType = 'incident_analysis';
            intent = 'investigate_issue';
            confidence = 0.7;
        } else if (['show', 'list', 'get', 'display', 'explore'].some(word => userQuery.includes(word))) {
            queryType = 'exploration';
            intent = 'explore_data';
            confidence = 0.6;
        } else {
            queryType = 'general';
            intent = 'general_inquiry';
            confidence = 0.5;
        }
        
        const fallbackState = {
            ...state,
            query_type: queryType,
            intent: intent,
            entities: [],
            confidence_score: confidence,
            specificity_level: 'medium',
            current_agent: this.name
        };
        
        const analysisContext = {
            analysis_method: 'fallback',
            analysis_timestamp: new Date().toISOString()
        };
        
        return updateStateContext(fallbackState, 'query_analysis', analysisContext);
    }
}

export default QueryAnalysisAgent;