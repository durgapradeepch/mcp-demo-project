/**
 * Incident Analysis Agent - Specialized agent for analyzing incidents and root causes
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
 * Specialized agent for deep incident analysis, root cause investigation,
 * and timeline construction from MCP tool results
 */
class IncidentAnalysisAgent {
    constructor() {
        this.name = 'IncidentAnalysisAgent';
        
        // Analysis thresholds
        this.analysisThresholds = {
            correlationConfidence: 0.7,
            timelineWindowMinutes: 60,
            maxRootCauses: 5,
            minEvidencePieces: 2
        };
    }

    /**
     * Main incident analysis orchestration using LLM intelligence
     * @param {Object} state - Current chat state
     * @returns {Promise<Object>} Updated state with analysis results
     */
    async analyzeIncidentData(state) {
        try {
            logger.info('🔍 Starting LLM-powered incident analysis');
            
            // Extract incident-related data from MCP results
            const incidentData = this._extractIncidentData(state.mcp_results || []);
            
            if (!incidentData.has_incidents) {
                logger.info('ℹ️ No incident data found, skipping specialized analysis');
                return state;
            }
            
            // Use LLM to analyze incident data intelligently
            const llmAnalysis = await llmClient.analyzeIncidentData(
                state.mcp_results || [],
                state.user_query || ''
            );
            
            // Build incident timeline (still useful for structure)
            const timeline = this._buildIncidentTimeline(incidentData, state.mcp_results || []);
            
            // Merge LLM analysis with structured data
            const analysisResults = {
                incident_summary: incidentData.summary,
                timeline: timeline,
                correlations: llmAnalysis.correlations || [],
                root_causes: llmAnalysis.root_causes || [],
                impact_analysis: llmAnalysis.impact_analysis || {},
                recommendations: llmAnalysis.recommendations || [],
                confidence_score: llmAnalysis.confidence_score || 0.5,
                analysis_timestamp: new Date().toISOString(),
                llm_insights: llmAnalysis.insights || ''
            };
            
            // Add fallback analysis if LLM didn't provide complete data
            if (!analysisResults.correlations.length) {
                analysisResults.correlations = this._performCorrelationAnalysis(incidentData, state.mcp_results || []);
            }
            
            if (!analysisResults.root_causes.length) {
                analysisResults.root_causes = this._identifyRootCauses(analysisResults.correlations, timeline);
            }
            
            // Update state
            const updatedState = {
                ...state,
                incident_analysis: analysisResults,
                current_agent: this.name
            };
            
            logger.info(`✅ LLM incident analysis completed: ${analysisResults.root_causes.length} root causes identified`);
            
            return updatedState;
            
        } catch (error) {
            logger.error(`❌ Incident analysis failed: ${error.message}`);
            return {
                ...state,
                error_count: (state.error_count || 0) + 1
            };
        }
    }

    /**
     * Extract and structure incident-related data from MCP results
     * @param {Array<Object>} mcpResults - MCP tool results
     * @returns {Object} Structured incident data
     */
    _extractIncidentData(mcpResults) {
        const incidentData = {
            has_incidents: false,
            incidents: [],
            logs: [],
            changelogs: [],
            resources: [],
            summary: {}
        };
        
        for (const result of mcpResults) {
            if (!result.success) {
                continue;
            }
            
            const toolName = result.tool_name;
            const data = result.result?.data || result.result || {};
            
            if (['get_incidents', 'search_incidents', 'get_incident_by_id'].includes(toolName)) {
                const incidents = this._normalizeIncidentsData(data);
                incidentData.incidents.push(...incidents);
                incidentData.has_incidents = incidents.length > 0;
            } else if (['search_logs', 'query_logs'].includes(toolName)) {
                const logs = this._normalizeLogsData(data);
                incidentData.logs.push(...logs);
            } else if (['get_changelogs', 'search_changelogs', 'get_changelog_by_resource'].includes(toolName)) {
                const changelogs = this._normalizeChangelogsData(data);
                incidentData.changelogs.push(...changelogs);
            } else if (['get_resources', 'get_resource_by_id'].includes(toolName)) {
                const resources = this._normalizeResourcesData(data);
                incidentData.resources.push(...resources);
            }
        }
        
        // Create summary
        incidentData.summary = {
            total_incidents: incidentData.incidents.length,
            total_logs: incidentData.logs.length,
            total_changelogs: incidentData.changelogs.length,
            total_resources: incidentData.resources.length,
            severity_distribution: this._analyzeSeverityDistribution(incidentData.incidents)
        };
        
        return incidentData;
    }

    /**
     * Build chronological timeline of incident-related events
     * @param {Object} incidentData - Structured incident data
     * @param {Array<Object>} mcpResults - Original MCP results
     * @returns {Array<Object>} Timeline events
     */
    _buildIncidentTimeline(incidentData, mcpResults) {
        const timelineEvents = [];
        
        // Add incidents to timeline
        for (const incident of incidentData.incidents) {
            timelineEvents.push({
                timestamp: incident.created_at || incident.timestamp,
                type: 'incident',
                severity: incident.severity || 'unknown',
                description: `Incident created: ${incident.title || 'Unknown incident'}`,
                data: incident,
                source: 'incidents'
            });
        }
        
        // Add logs to timeline
        for (const logEntry of incidentData.logs) {
            timelineEvents.push({
                timestamp: logEntry.timestamp || logEntry._time,
                type: 'log_event',
                severity: logEntry.level || 'info',
                description: `Log: ${logEntry._msg || logEntry.message || 'Log event'}`,
                data: logEntry,
                source: 'logs'
            });
        }
        
        // Add changelogs to timeline
        for (const changelog of incidentData.changelogs) {
            timelineEvents.push({
                timestamp: changelog.timestamp || changelog.created_at,
                type: 'change_event',
                severity: changelog.severity || 'medium',
                description: `Change: ${changelog.description || 'System change'}`,
                data: changelog,
                source: 'changelogs'
            });
        }
        
        // Sort by timestamp and filter valid entries
        const validEvents = timelineEvents.filter(event => event.timestamp);
        validEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        return validEvents;
    }

    /**
     * Analyze correlations between incidents, changes, and logs
     * @param {Object} incidentData - Structured incident data
     * @param {Array<Object>} mcpResults - MCP results
     * @returns {Array<Object>} Correlation analysis
     */
    _performCorrelationAnalysis(incidentData, mcpResults) {
        const correlations = [];
        
        for (const incident of incidentData.incidents) {
            const incidentTime = this._parseTimestamp(incident.created_at || incident.timestamp);
            if (!incidentTime) {
                continue;
            }
            
            // Find correlated changes (within time window before incident)
            const timeWindowStart = new Date(incidentTime.getTime() - (this.analysisThresholds.timelineWindowMinutes * 60 * 1000));
            
            const correlatedChanges = [];
            for (const changelog of incidentData.changelogs) {
                const changeTime = this._parseTimestamp(changelog.timestamp || changelog.created_at);
                if (changeTime && changeTime >= timeWindowStart && changeTime <= incidentTime) {
                    correlatedChanges.push(changelog);
                }
            }
            
            // Find correlated log events
            const correlatedLogs = [];
            for (const logEntry of incidentData.logs) {
                const logTime = this._parseTimestamp(logEntry.timestamp || logEntry._time);
                if (logTime && Math.abs(logTime.getTime() - incidentTime.getTime()) <= 1800000) { // 30 minutes
                    correlatedLogs.push(logEntry);
                }
            }
            
            // Calculate correlation confidence
            const confidence = this._calculateCorrelationConfidence(incident, correlatedChanges, correlatedLogs);
            
            if (confidence >= this.analysisThresholds.correlationConfidence) {
                const correlation = {
                    incident: incident,
                    correlated_changes: correlatedChanges,
                    correlated_logs: correlatedLogs,
                    confidence: confidence,
                    time_window: {
                        start: timeWindowStart.toISOString(),
                        end: incidentTime.toISOString()
                    }
                };
                correlations.push(correlation);
            }
        }
        
        // Sort by confidence
        correlations.sort((a, b) => b.confidence - a.confidence);
        
        return correlations;
    }

    /**
     * Identify potential root causes from correlations and timeline
     * @param {Array<Object>} correlations - Correlation analysis
     * @param {Array<Object>} timeline - Timeline events
     * @returns {Array<Object>} Root causes
     */
    _identifyRootCauses(correlations, timeline) {
        const rootCauses = [];
        
        for (const correlation of correlations.slice(0, this.analysisThresholds.maxRootCauses)) {
            // Analyze changes as potential root causes
            for (const change of correlation.correlated_changes) {
                const rootCause = {
                    type: 'change_event',
                    description: change.description || 'System change',
                    confidence: correlation.confidence * 0.9, // Slightly reduce for change events
                    evidence: [
                        `Change occurred ${this._getTimeBeforeIncident(change, correlation.incident)} before incident`,
                        `Correlation confidence: ${(correlation.confidence * 100).toFixed(0)}%`
                    ],
                    source_data: change,
                    recommended_actions: this._getChangeActions(change)
                };
                
                // Add additional evidence from logs
                const relatedErrorLogs = correlation.correlated_logs.filter(log => 
                    ['ERROR', 'CRITICAL'].includes((log.level || '').toUpperCase())
                );
                
                if (relatedErrorLogs.length > 0) {
                    rootCause.evidence.push(`${relatedErrorLogs.length} error logs found around the same time`);
                    rootCause.confidence += 0.1;
                }
                
                rootCauses.push(rootCause);
            }
            
            // Analyze log patterns as root causes
            const errorPatterns = this._analyzeLogPatterns(correlation.correlated_logs);
            for (const pattern of errorPatterns) {
                if (pattern.significance > 0.7) {
                    const rootCause = {
                        type: 'log_pattern',
                        description: `Error pattern: ${pattern.pattern}`,
                        confidence: pattern.significance,
                        evidence: [
                            `Pattern appears ${pattern.count} times`,
                            `First occurrence: ${pattern.first_occurrence}`,
                            `Pattern significance: ${(pattern.significance * 100).toFixed(0)}%`
                        ],
                        source_data: pattern,
                        recommended_actions: this._getLogPatternActions(pattern)
                    };
                    rootCauses.push(rootCause);
                }
            }
        }
        
        // Sort by confidence and limit results
        rootCauses.sort((a, b) => b.confidence - a.confidence);
        return rootCauses.slice(0, this.analysisThresholds.maxRootCauses);
    }

    // Helper methods for data normalization and processing

    _normalizeIncidentsData(data) {
        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data.incidents)) {
                return data.incidents;
            } else if (data.incident) {
                return [data.incident];
            } else if (data.incidents) {
                return [data.incidents];
            } else {
                return [data];
            }
        } else if (Array.isArray(data)) {
            return data;
        }
        return [];
    }

    _normalizeLogsData(data) {
        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data.logs)) {
                return data.logs;
            } else {
                return [data];
            }
        } else if (Array.isArray(data)) {
            return data;
        }
        return [];
    }

    _normalizeChangelogsData(data) {
        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data.changelogs)) {
                return data.changelogs;
            } else {
                return [data];
            }
        } else if (Array.isArray(data)) {
            return data;
        }
        return [];
    }

    _normalizeResourcesData(data) {
        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data.resources)) {
                return data.resources;
            } else if (data.resource) {
                return [data.resource];
            } else if (data.resources) {
                return [data.resources];
            } else {
                return [data];
            }
        } else if (Array.isArray(data)) {
            return data;
        }
        return [];
    }

    _parseTimestamp(timestampStr) {
        if (!timestampStr) {
            return null;
        }
        
        // Try different timestamp formats
        const formats = [
            'YYYY-MM-DDTHH:mm:ss.SSSZ',
            'YYYY-MM-DDTHH:mm:ssZ',
            'YYYY-MM-DDTHH:mm:ss',
            'YYYY-MM-DD HH:mm:ss'
        ];
        
        for (const fmt of formats) {
            try {
                const date = new Date(timestampStr);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            } catch (error) {
                // Continue to next format
            }
        }
        
        return null;
    }

    _analyzeSeverityDistribution(incidents) {
        const distribution = {};
        for (const incident of incidents) {
            const severity = (incident.severity || 'unknown').toLowerCase();
            distribution[severity] = (distribution[severity] || 0) + 1;
        }
        return distribution;
    }

    _calculateCorrelationConfidence(incident, changes, logs) {
        let baseConfidence = 0.5;
        
        // Boost based on number of correlated changes
        if (changes.length > 0) {
            baseConfidence += Math.min(changes.length * 0.15, 0.3);
        }
        
        // Boost based on error logs
        const errorLogs = logs.filter(log => ['ERROR', 'CRITICAL'].includes((log.level || '').toUpperCase()));
        if (errorLogs.length > 0) {
            baseConfidence += Math.min(errorLogs.length * 0.1, 0.2);
        }
        
        return Math.min(baseConfidence, 1.0);
    }

    _getTimeBeforeIncident(change, incident) {
        const changeTime = this._parseTimestamp(change.timestamp || change.created_at);
        const incidentTime = this._parseTimestamp(incident.created_at || incident.timestamp);
        
        if (!changeTime || !incidentTime) {
            return 'unknown time';
        }
        
        const diff = incidentTime.getTime() - changeTime.getTime();
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 60) {
            return `${minutes} minutes`;
        } else {
            const hours = Math.floor(minutes / 60);
            return `${hours} hours ${minutes % 60} minutes`;
        }
    }

    _getChangeActions(change) {
        const actions = [];
        
        const changeType = (change.type || '').toLowerCase();
        if (changeType.includes('deployment')) {
            actions.push(
                'Review deployment logs for errors',
                'Consider rollback if deployment caused issues',
                'Check application health after deployment'
            );
        } else if (changeType.includes('configuration')) {
            actions.push(
                'Review configuration changes',
                'Validate configuration against known good state'
            );
        } else {
            actions.push('Investigate the timing correlation between this change and the incident');
        }
        
        return actions;
    }

    _analyzeLogPatterns(logs) {
        const patterns = [];
        
        // Group by message content
        const messageCounts = {};
        for (const log of logs) {
            const message = (log._msg || log.message || '').trim();
            if (message) {
                messageCounts[message] = (messageCounts[message] || 0) + 1;
            }
        }
        
        // Identify significant patterns
        for (const [message, count] of Object.entries(messageCounts)) {
            if (count > 1) { // Pattern appears multiple times
                const significance = Math.min(count / 10, 1.0); // Cap at 1.0
                patterns.push({
                    pattern: message,
                    count: count,
                    significance: significance,
                    first_occurrence: logs[0]?.timestamp || 'unknown'
                });
            }
        }
        
        return patterns;
    }

    _getLogPatternActions(pattern) {
        return [
            `Investigate recurring pattern: ${pattern.pattern}`,
            'Check application logs for related errors',
            'Review system resource utilization'
        ];
    }
}

export default IncidentAnalysisAgent;