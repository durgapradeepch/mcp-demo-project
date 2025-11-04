/**
 * Response Enrichment Agent - Enriches responses with context, annotations, and forward links
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
 * Specialized agent for enriching responses with:
 * - Forward linking suggestions
 * - Contextual annotations
 * - Additional insights
 * - Actionable recommendations
 */
class ResponseEnrichmentAgent {
    constructor() {
        this.name = 'ResponseEnrichmentAgent';
        
        // Enrichment templates
        this.forwardLinkTemplates = {
            incident_analysis: [
                'Investigate related incidents in the past week',
                'Check health status of affected resources',
                'Review recent deployments to related systems',
                'Analyze error patterns for similar services'
            ],
            exploration: [
                'Get detailed statistics for this data',
                'Explore relationships between these entities',
                'Check recent activity on these resources',
                'View configuration details'
            ],
            root_cause: [
                'Create incident report for this issue',
                'Set up monitoring alerts for similar patterns',
                'Review change management process',
                'Schedule post-incident review'
            ]
        };
    }

    /**
     * Main response enrichment orchestration using LLM intelligence
     * @param {Object} state - Current chat state
     * @returns {Promise<Object>} Updated state with enriched response
     */
    async enrichResponse(state) {
        try {
            logger.info('✨ Enriching response with LLM-powered context and insights');
            
            // Use LLM to generate comprehensive enriched response
            let finalResponse, forwardLinks, recommendations, insights;
            
            try {
                const llmResponse = await llmClient.generateEnrichedResponse(state);
                
                // Extract LLM-generated content
                finalResponse = llmResponse.final_response || '';
                forwardLinks = llmResponse.forward_links || [];
                recommendations = llmResponse.recommendations || [];
                insights = llmResponse.insights || {};
                
            } catch (llmError) {
                logger.warn(`LLM response generation failed: ${llmError.message}, using fallback`);
                
                // Fallback to traditional methods
                forwardLinks = this._generateForwardLinks(state);
                recommendations = this._generateRecommendations(state);
                insights = this._extractContextualInsights(state);
                finalResponse = await this._formatFinalResponse(state, insights);
            }
            
            // Always generate annotations (not LLM dependent)
            const annotations = this._createAnnotations(state);
            
            // Compile enrichment data
            const enrichmentData = {
                forward_links: forwardLinks,
                annotations: annotations,
                contextual_insights: insights,
                recommendations: recommendations,
                enrichment_timestamp: new Date().toISOString(),
                enrichment_quality: this._assessEnrichmentQuality(forwardLinks, annotations, insights)
            };
            
            // Update state
            const updatedState = {
                ...state,
                enrichment_data: enrichmentData,
                forward_links: forwardLinks,
                annotations: annotations,
                final_response: finalResponse,
                current_agent: this.name
            };
            
            logger.info(`✅ Response enrichment completed with ${forwardLinks.length} forward links`);
            
            return updatedState;
            
        } catch (error) {
            logger.error(`❌ Response enrichment failed: ${error.message}`);
            // Return basic response without enrichment
            return {
                ...state,
                final_response: this._createFallbackResponse(state),
                error_count: (state.error_count || 0) + 1
            };
        }
    }

    /**
     * Generate intelligent forward link suggestions
     * @param {Object} state - Current state
     * @returns {Array<string>} Forward links
     */
    _generateForwardLinks(state) {
        const forwardLinks = [];
        const queryType = state.query_type || 'general';
        
        // Get template links for query type
        const templateLinks = this.forwardLinkTemplates[queryType] || [];
        forwardLinks.push(...templateLinks.slice(0, 3)); // Take first 3 template links
        
        // Generate context-specific links based on MCP results
        const contextLinks = this._generateContextSpecificLinks(state);
        forwardLinks.push(...contextLinks);
        
        // Generate links based on incident analysis if available
        if (state.incident_analysis) {
            const incidentLinks = this._generateIncidentLinks(state.incident_analysis);
            forwardLinks.push(...incidentLinks);
        }
        
        // Generate links based on discovered entities
        const entityLinks = this._generateEntityLinks(state);
        forwardLinks.push(...entityLinks);
        
        // Remove duplicates and limit
        const uniqueLinks = [...new Set(forwardLinks)];
        return uniqueLinks.slice(0, 8); // Limit to 8 forward links
    }

    /**
     * Generate links based on MCP tool results
     * @param {Object} state - Current state
     * @returns {Array<string>} Context-specific links
     */
    _generateContextSpecificLinks(state) {
        const links = [];
        
        for (const result of (state.mcp_results || [])) {
            if (!result.success) {
                continue;
            }
            
            const toolName = result.tool_name;
            const data = result.result?.data || result.result || {};
            
            // Links based on specific tools
            if (toolName === 'search_logs' && typeof data === 'object') {
                if (data.logs) {
                    links.push('Analyze log patterns over a longer time period');
                    links.push('Set up alerts for similar log patterns');
                }
            } else if (['get_incidents', 'search_incidents'].includes(toolName)) {
                if (typeof data === 'object' && data.incidents) {
                    links.push('Review incident trends and patterns');
                    links.push('Check status of related incidents');
                }
            } else if (['get_changelogs', 'search_changelogs'].includes(toolName)) {
                if (typeof data === 'object' && data.changelogs) {
                    links.push('Review change management process');
                    links.push('Analyze impact of recent changes');
                }
            } else if (['get_resources', 'get_resource_by_id'].includes(toolName)) {
                if (typeof data === 'object') {
                    links.push('Monitor resource health and performance');
                    links.push('Review resource configuration');
                }
            }
        }
        
        return links;
    }

    /**
     * Generate links based on incident analysis results
     * @param {Object} incidentAnalysis - Incident analysis data
     * @returns {Array<string>} Incident-related links
     */
    _generateIncidentLinks(incidentAnalysis) {
        const links = [];
        
        // Links based on root causes
        const rootCauses = incidentAnalysis.root_causes || [];
        if (rootCauses.length > 0) {
            links.push('Create prevention measures for identified root causes');
            links.push('Schedule team review of incident response');
        }
        
        // Links based on impact
        const impact = incidentAnalysis.impact_analysis || {};
        if (impact.impact_level === 'high') {
            links.push('Escalate to management and create action plan');
            links.push('Conduct post-incident review meeting');
        }
        
        // Links based on affected resources
        const affectedResources = impact.affected_resources || [];
        if (affectedResources.length > 3) {
            links.push('Perform comprehensive health check on all affected resources');
        }
        
        return links;
    }

    /**
     * Generate links based on entities found in the query
     * @param {Object} state - Current state
     * @returns {Array<string>} Entity-based links
     */
    _generateEntityLinks(state) {
        const links = [];
        const entities = state.entities || [];
        
        for (const entity of entities) {
            const entityType = entity.type;
            const entityValue = entity.value;
            
            if (entityType === 'resource_id') {
                links.push(`Get detailed configuration for resource ${entityValue}`);
                links.push(`Check performance metrics for ${entityValue}`);
            } else if (entityType === 'incident_id') {
                links.push(`Get full timeline for incident ${entityValue}`);
                links.push(`Review related incidents to ${entityValue}`);
            }
        }
        
        return links;
    }

    /**
     * Create contextual annotations for the response
     * @param {Object} state - Current state
     * @returns {Array<string>} Annotations
     */
    _createAnnotations(state) {
        const annotations = [];
        
        // Quality annotations
        const confidenceScore = state.confidence_score || 0;
        if (confidenceScore < 0.7) {
            annotations.push('⚠️ Analysis confidence is moderate - consider gathering more information');
        }
        
        // Data quality annotations
        const executionStats = state.context_data?.execution_stats || {};
        const successRate = executionStats.success_rate || 1.0;
        if (successRate < 0.8) {
            annotations.push('⚠️ Some data sources were unavailable - results may be incomplete');
        }
        
        // Analysis-specific annotations
        if (state.incident_analysis) {
            const incidentAnalysis = state.incident_analysis;
            
            // Root cause annotations
            const rootCauses = incidentAnalysis.root_causes || [];
            if (rootCauses.length > 3) {
                annotations.push('💡 Multiple potential root causes identified - prioritize by confidence score');
            }
            
            // Timeline annotations
            const timeline = incidentAnalysis.timeline || [];
            if (timeline.length > 20) {
                annotations.push('📊 Complex incident with many events - timeline analysis available');
            }
        }
        
        // Tool execution annotations
        const executedTools = state.executed_tools || [];
        if (executedTools.length > 5) {
            annotations.push('🔍 Comprehensive analysis performed across multiple data sources');
        }
        
        return annotations;
    }

    /**
     * Extract key insights from the analysis
     * @param {Object} state - Current state
     * @returns {Object} Contextual insights
     */
    _extractContextualInsights(state) {
        const insights = {
            key_findings: [],
            patterns_detected: [],
            risk_indicators: [],
            performance_metrics: {}
        };
        
        // Extract key findings from incident analysis
        if (state.incident_analysis) {
            const incidentAnalysis = state.incident_analysis;
            
            // Key findings from root causes
            const rootCauses = incidentAnalysis.root_causes || [];
            for (const rootCause of rootCauses.slice(0, 3)) {
                insights.key_findings.push({
                    finding: rootCause.description,
                    confidence: rootCause.confidence,
                    type: 'root_cause'
                });
            }
            
            // Pattern detection
            const correlations = incidentAnalysis.correlations || [];
            if (correlations.length > 0) {
                insights.patterns_detected.push({
                    pattern: `${correlations.length} incident correlations found`,
                    significance: correlations.length > 2 ? 'high' : 'medium'
                });
            }
        }
        
        // Extract findings from MCP results
        const mcpFindings = this._extractMCPInsights(state.mcp_results || []);
        insights.key_findings.push(...mcpFindings);
        
        // Performance metrics
        const executionStats = state.context_data?.execution_stats || {};
        if (Object.keys(executionStats).length > 0) {
            insights.performance_metrics = {
                tools_executed: executionStats.successful_tools || 0,
                success_rate: `${((executionStats.success_rate || 0) * 100).toFixed(1)}%`,
                analysis_depth: state.investigation_depth || 1
            };
        }
        
        return insights;
    }

    /**
     * Extract insights from MCP tool results
     * @param {Array<Object>} mcpResults - MCP results
     * @returns {Array<Object>} MCP insights
     */
    _extractMCPInsights(mcpResults) {
        const insights = [];
        
        for (const result of mcpResults) {
            if (!result.success) {
                continue;
            }
            
            const toolName = result.tool_name;
            const data = result.result?.data || result.result || {};
            
            if (toolName === 'get_database_stats' && typeof data === 'object') {
                const totalNodes = data.total_nodes || 0;
                if (totalNodes > 1000) {
                    insights.push({
                        finding: `Large dataset detected: ${totalNodes.toLocaleString()} nodes in database`,
                        confidence: 1.0,
                        type: 'data_scale'
                    });
                }
            } else if (toolName === 'search_logs' && typeof data === 'object') {
                const logs = data.logs || [];
                const errorLogs = logs.filter(log => (log.level || '').toUpperCase() === 'ERROR');
                if (errorLogs.length > 10) {
                    insights.push({
                        finding: `High error volume: ${errorLogs.length} error logs found`,
                        confidence: 0.9,
                        type: 'error_pattern'
                    });
                }
            }
        }
        
        return insights;
    }

    /**
     * Generate actionable recommendations
     * @param {Object} state - Current state
     * @returns {Array<string>} Recommendations
     */
    _generateRecommendations(state) {
        const recommendations = [];
        
        // Recommendations from incident analysis
        if (state.incident_analysis) {
            const analysisRecommendations = state.incident_analysis.recommendations || [];
            recommendations.push(...analysisRecommendations.slice(0, 3));
        }
        
        // Query-type specific recommendations
        const queryType = state.query_type || 'general';
        
        if (queryType === 'incident_analysis') {
            recommendations.push(
                'Document findings in incident management system',
                'Update runbooks based on lessons learned',
                'Schedule follow-up review in 24-48 hours'
            );
        } else if (queryType === 'exploration') {
            recommendations.push(
                'Consider setting up monitoring for explored data',
                'Create dashboard for ongoing visibility'
            );
        }
        
        // Remove duplicates and limit
        const uniqueRecommendations = [...new Set(recommendations)];
        return uniqueRecommendations.slice(0, 5);
    }

    /**
     * Format the final comprehensive response
     * @param {Object} state - Current state
     * @param {Object} insights - Extracted insights
     * @returns {Promise<string>} Formatted response
     */
    async _formatFinalResponse(state, insights) {
        try {
            // Use LLM to generate enriched response
            const enrichedResponse = await llmClient.generateEnrichedResponse(state);
            
            if (enrichedResponse && typeof enrichedResponse.final_response === 'string') {
                return enrichedResponse.final_response;
            }
            
            // Fallback if LLM doesn't return valid response
            logger.warn('LLM returned invalid response, using fallback formatting');
            
        } catch (error) {
            logger.error(`Error in LLM response generation, using fallback: ${error.message}`);
        }
        
        // Fallback to original formatting logic
        const userQuery = state.user_query;
        const queryType = state.query_type || 'general';
        
        const responseParts = [];
        
        // Opening based on query type
        if (queryType === 'incident_analysis') {
            responseParts.push('🔍 **Incident Analysis Complete**');
        } else if (queryType === 'exploration') {
            responseParts.push('📊 **Data Exploration Results**');
        } else {
            responseParts.push('✅ **Analysis Complete**');
        }
        
        // Add key findings
        const keyFindings = insights.key_findings || [];
        if (keyFindings.length > 0) {
            responseParts.push('', '**Key Findings:**');
            for (const finding of keyFindings.slice(0, 3)) {
                const confidenceEmoji = finding.confidence > 0.8 ? '🔴' : finding.confidence > 0.6 ? '🟡' : '⚪';
                responseParts.push(`• ${confidenceEmoji} ${finding.finding}`);
            }
        }
        
        // Add incident analysis summary if available
        if (state.incident_analysis) {
            const incidentAnalysis = state.incident_analysis;
            const rootCauses = incidentAnalysis.root_causes || [];
            
            if (rootCauses.length > 0) {
                responseParts.push('', `**Root Cause Analysis:** ${rootCauses.length} potential causes identified`);
                
                for (let i = 0; i < Math.min(rootCauses.length, 2); i++) {
                    const cause = rootCauses[i];
                    const confidencePct = `${Math.round(cause.confidence * 100)}%`;
                    responseParts.push(`${i + 1}. ${cause.description} (Confidence: ${confidencePct})`);
                }
            }
        }
        
        // Add performance metrics
        const perfMetrics = insights.performance_metrics || {};
        if (Object.keys(perfMetrics).length > 0) {
            const toolsCount = perfMetrics.tools_executed || 0;
            const successRate = perfMetrics.success_rate || '0%';
            responseParts.push('', `**Analysis Overview:** ${toolsCount} data sources analyzed (${successRate} success rate)`);
        }
        
        return responseParts.join('\n');
    }

    /**
     * Assess the quality of the enrichment
     * @param {Array<string>} forwardLinks - Forward links
     * @param {Array<string>} annotations - Annotations
     * @param {Object} insights - Insights
     * @returns {number} Quality score (0-1)
     */
    _assessEnrichmentQuality(forwardLinks, annotations, insights) {
        let qualityScore = 0.0;
        
        // Score based on forward links
        if (forwardLinks.length >= 5) {
            qualityScore += 0.3;
        } else if (forwardLinks.length >= 3) {
            qualityScore += 0.2;
        }
        
        // Score based on annotations
        if (annotations.length >= 2) {
            qualityScore += 0.2;
        } else if (annotations.length >= 1) {
            qualityScore += 0.1;
        }
        
        // Score based on insights
        const keyFindings = insights.key_findings || [];
        if (keyFindings.length >= 3) {
            qualityScore += 0.3;
        } else if (keyFindings.length >= 1) {
            qualityScore += 0.2;
        }
        
        // Score based on performance metrics
        if (insights.performance_metrics && Object.keys(insights.performance_metrics).length > 0) {
            qualityScore += 0.2;
        }
        
        return Math.min(qualityScore, 1.0);
    }

    /**
     * Create a basic fallback response when enrichment fails
     * @param {Object} state - Current state
     * @returns {string} Fallback response
     */
    _createFallbackResponse(state) {
        const userQuery = state.user_query;
        
        // Count successful tool executions
        const successfulTools = (state.mcp_results || []).filter(r => r.success).length;
        
        if (successfulTools > 0) {
            return `Analysis completed for your query: '${userQuery}'. ${successfulTools} data sources were successfully analyzed.`;
        } else {
            return `I processed your query: '${userQuery}', but encountered some issues retrieving data. Please try again or rephrase your question.`;
        }
    }
}

export default ResponseEnrichmentAgent;