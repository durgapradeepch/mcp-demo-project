/**
 * LLM Client for dynamic decision making throughout the workflow
 * JavaScript implementation with OpenAI integration
 */

import OpenAI from 'openai';
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

class LLMDecisionMaker {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY || '';
        this.model = process.env.LLM_MODEL || 'gpt-4-turbo-preview';
        this.temperature = parseFloat(process.env.LLM_TEMPERATURE || '0.3');
        
        // Initialize OpenAI client
        if (this.apiKey) {
            this.openaiClient = new OpenAI({
                apiKey: this.apiKey
            });
        } else {
            logger.warn('⚠️ No OpenAI API key found. LLM features will use fallback logic.');
            this.openaiClient = null;
        }
    }

    /**
     * Use LLM to analyze user query and determine intent, entities, and strategy.
     * Handles both single and multi-part queries.
     * @param {string} userQuery - The user's query
     * @param {string[]} availableTools - List of available MCP tools
     * @returns {Promise<Object>} Query analysis results
     */
    async analyzeQueryIntent(userQuery, availableTools) {
        if (!this.openaiClient) {
            return this._fallbackQueryAnalysis(userQuery);
        }

        const systemPrompt = `
        You are a query analysis expert for a database investigation system.
        
        Available MCP Tools: ${availableTools.join(', ')}
        
        Analyze the user query and provide:
        1. is_multi_part: true if query contains multiple distinct questions/tasks
        2. sub_queries: If multi-part, break into separate logical queries
        3. query_type: "incident_analysis", "exploration", "root_cause", "data_retrieval", or "general"
        4. intent: Brief description of what the user wants
        5. entities: List of specific entities mentioned (IDs, names, dates, etc.)
        6. confidence_score: 0.0-1.0 confidence in your analysis
        7. specificity_level: "high", "medium", or "low" based on how specific the query is
        8. investigation_strategy: Explain how to approach this query
        9. execution_plan: If multi-part, specify "sequential" or "parallel" execution
        10. priority_order: If multi-part, order sub-queries by priority (1=highest)
        
        Respond in JSON format only.
        `;

        try {
            const response = await this.openaiClient.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `User Query: ${userQuery}` }
                ],
                temperature: this.temperature
            });

            const analysis = JSON.parse(response.choices[0].message.content);
            logger.info(`🧠 LLM Query Analysis: ${analysis.query_type} (confidence: ${analysis.confidence_score})`);
            
            return analysis;
            
        } catch (error) {
            logger.error(`❌ LLM query analysis failed: ${error.message}`);
            return this._fallbackQueryAnalysis(userQuery);
        }
    }

    /**
     * Use LLM to dynamically plan tool execution sequence based on query and available tools
     * @param {Object} queryAnalysis - Results from query analysis
     * @param {string[]} availableTools - List of available tools
     * @param {Object} [context=null] - Additional context
     * @returns {Promise<string[]>} Ordered list of tools to execute
     */
    async planToolSequence(queryAnalysis, availableTools, context = null) {
        if (!this.openaiClient) {
            return this._fallbackToolPlanning(queryAnalysis, availableTools);
        }

        const contextInfo = context ? `Previous context: ${JSON.stringify(context)}` : 'No previous context';

        const systemPrompt = `
        You are a tool orchestration expert. Plan the optimal sequence of tools to answer the user's query.
        
        Available Tools: ${availableTools.join(', ')}
        
        Query Analysis: ${JSON.stringify(queryAnalysis)}
        ${contextInfo}
        
        Consider:
        - Dependencies between tools (some tools need results from others)
        - Efficiency (parallel vs sequential execution)
        - Query specificity (broad investigation vs targeted lookup)
        
        Respond with a JSON array of tool names in execution order.
        Example: ["search_logs", "get_incidents", "get_resource_by_id"]
        `;

        try {
            const response = await this.openaiClient.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Plan tools for: ${queryAnalysis.intent || 'Unknown query'}` }
                ],
                temperature: this.temperature
            });

            const toolSequence = JSON.parse(response.choices[0].message.content);
            
            // Validate tools exist
            const validTools = toolSequence.filter(tool => availableTools.includes(tool));
            
            logger.info(`🛠️ LLM Tool Planning: ${validTools.length} tools planned`);
            return validTools;
            
        } catch (error) {
            logger.error(`❌ LLM tool planning failed: ${error.message}`);
            return this._fallbackToolPlanning(queryAnalysis, availableTools);
        }
    }

    /**
     * Plan execution strategy for multi-part queries
     * @param {string} userQuery - Original user query
     * @param {Object} queryAnalysis - Query analysis results
     * @param {string[]} availableTools - Available tools
     * @returns {Promise<Object>} Multi-query execution plan
     */
    async planMultiQueryExecution(userQuery, queryAnalysis, availableTools) {
        if (!this.openaiClient) {
            return this._fallbackMultiQueryPlanning(queryAnalysis);
        }

        if (!queryAnalysis.is_multi_part) {
            // Single query - use standard planning
            const tools = await this.planToolSequence(queryAnalysis, availableTools);
            return {
                execution_type: 'single',
                query_plan: {
                    main_query: {
                        query: userQuery,
                        tools: tools,
                        priority: 1
                    }
                }
            };
        }

        const systemPrompt = `
        You are an execution planner for multi-part database queries.
        
        Available Tools: ${availableTools.join(', ')}
        
        The user has a multi-part query with these sub-queries:
        ${JSON.stringify(queryAnalysis.sub_queries || [])}
        
        Plan the execution strategy:
        1. For each sub-query, determine required tools
        2. Identify dependencies between sub-queries
        3. Decide execution order and parallelization opportunities
        4. Assign priority levels (1=highest, 5=lowest)
        
        Respond with JSON:
        {
            "execution_type": "sequential" or "parallel" or "mixed",
            "query_plan": {
                "query_1": {
                    "query": "sub-query text",
                    "tools": ["tool1", "tool2"],
                    "priority": 1,
                    "depends_on": []
                },
                "query_2": {
                    "query": "sub-query text", 
                    "tools": ["tool3"],
                    "priority": 2,
                    "depends_on": ["query_1"]
                }
            },
            "estimated_execution_time": "seconds",
            "parallelization_opportunities": ["query_1", "query_3"]
        }
        `;

        try {
            const response = await this.openaiClient.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Multi-part query: ${userQuery}` }
                ],
                temperature: this.temperature
            });

            const executionPlan = JSON.parse(response.choices[0].message.content);
            
            logger.info(`🎯 Multi-Query Plan: ${executionPlan.execution_type} execution with ${Object.keys(executionPlan.query_plan).length} sub-queries`);
            return executionPlan;
            
        } catch (error) {
            logger.error(`❌ Multi-query planning failed: ${error.message}`);
            return this._fallbackMultiQueryPlanning(queryAnalysis);
        }
    }

    /**
     * Use LLM to make intelligent routing decisions in the workflow
     * @param {Object} state - Current workflow state
     * @returns {Promise<string>} Route decision
     */
    async makeRoutingDecision(state) {
        if (!this.openaiClient) {
            return this._fallbackRoutingDecision(state);
        }

        const systemPrompt = `
        You are a workflow router. Based on the current state, decide the next step.
        
        Available routes:
        - "incident_analysis": Deep investigation of incidents and root causes
        - "response_enrichment": Generate final response with recommendations  
        - "error_recovery": Handle errors and provide fallback response
        - "continue_execution": Continue with more tool executions
        
        Respond with only the route name.
        `;

        const stateSummary = {
            query_type: state.query_type,
            executed_tools: state.executed_tools?.length || 0,
            error_count: state.error_count || 0,
            has_incidents: Boolean(state.incident_analysis),
            mcp_results_count: state.mcp_results?.length || 0
        };

        try {
            const response = await this.openaiClient.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Current state: ${JSON.stringify(stateSummary)}` }
                ],
                temperature: 0.1  // Lower temperature for routing decisions
            });

            const route = response.choices[0].message.content.trim();
            logger.info(`🚦 LLM Routing Decision: ${route}`);
            
            return route;
            
        } catch (error) {
            logger.error(`❌ LLM routing decision failed: ${error.message}`);
            return this._fallbackRoutingDecision(state);
        }
    }

    /**
     * Use LLM to perform dynamic incident analysis and correlation
     * @param {Object[]} mcpResults - Results from MCP tool executions
     * @param {string} userQuery - Original user query
     * @returns {Promise<Object>} Incident analysis results
     */
    async analyzeIncidentData(mcpResults, userQuery) {
        if (!this.openaiClient) {
            return this._fallbackIncidentAnalysis(mcpResults);
        }

        const systemPrompt = `
        You are an expert incident analyst. Analyze the provided data to identify:
        1. root_causes: List of potential root causes with evidence
        2. correlations: Connections between different data points
        3. timeline: Chronological sequence of events
        4. affected_resources: Resources impacted by incidents
        5. confidence_score: 0.0-1.0 confidence in your analysis
        6. recommendations: Actionable next steps
        
        Focus on finding patterns, correlations, and causation chains.
        Respond in JSON format.
        `;

        // Summarize MCP results for LLM
        const dataSummary = [];
        for (const result of mcpResults) {
            if (result.success) {
                const toolName = result.tool_name;
                const data = result.result || {};
                const summary = `${toolName}: ${JSON.stringify(data).substring(0, 500)}...`;  // Truncate for token limits
                dataSummary.push(summary);
            }
        }

        try {
            const response = await this.openaiClient.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `User Query: ${userQuery}\n\nData to analyze:\n${dataSummary.join('\n')}` }
                ],
                temperature: this.temperature
            });

            const analysis = JSON.parse(response.choices[0].message.content);
            logger.info(`🔍 LLM Incident Analysis: ${analysis.root_causes?.length || 0} root causes found`);
            
            return analysis;
            
        } catch (error) {
            logger.error(`❌ LLM incident analysis failed: ${error.message}`);
            return this._fallbackIncidentAnalysis(mcpResults);
        }
    }

    /**
     * Use LLM to generate contextual, actionable response
     * @param {Object} state - Current workflow state
     * @returns {Promise<Object>} Enhanced response
     */
    async generateEnrichedResponse(state) {
        if (!this.openaiClient) {
            return this._fallbackResponseGeneration(state);
        }

        const systemPrompt = `
        You are a helpful assistant generating responses for database investigations.
        
        Create a comprehensive response that includes:
        1. final_response: Clear, actionable answer to the user's question
        2. forward_links: List of specific next actions the user should take
        3. annotations: Important context or warnings
        4. confidence: 0.0-1.0 confidence in the response
        
        Make it conversational but informative. Include specific details from the data.
        Respond in JSON format.
        `;

        // Prepare context for LLM
        const context = {
            original_query: state.user_query,
            query_analysis: {
                type: state.query_type,
                intent: state.intent
            },
            execution_summary: {
                tools_executed: state.executed_tools?.length || 0,
                success_count: state.mcp_results?.filter(r => r.success).length || 0
            },
            key_findings: state.incident_analysis || {},
            enrichment_data: state.enrichment_data || {}
        };

        try {
            const response = await this.openaiClient.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Generate response for: ${JSON.stringify(context)}` }
                ],
                temperature: this.temperature
            });

            const enrichedResponse = JSON.parse(response.choices[0].message.content);
            logger.info(`✨ LLM Response Generation: Generated ${enrichedResponse.forward_links?.length || 0} forward links`);
            
            return enrichedResponse;
            
        } catch (error) {
            logger.error(`❌ LLM response generation failed: ${error.message}`);
            return this._fallbackResponseGeneration(state);
        }
    }

    // Fallback methods for when LLM is unavailable

    _fallbackQueryAnalysis(userQuery) {
        const queryLower = userQuery.toLowerCase();
        
        if (['error', 'incident', 'problem', 'failure'].some(word => queryLower.includes(word))) {
            return {
                is_multi_part: false,
                sub_queries: [userQuery],
                query_type: 'incident_analysis',
                intent: 'investigate_issue',
                entities: [],
                confidence_score: 0.7,
                specificity_level: 'medium',
                investigation_strategy: 'Broad incident investigation',
                execution_plan: 'sequential',
                priority_order: [1]
            };
        } else {
            return {
                is_multi_part: false,
                sub_queries: [userQuery],
                query_type: 'exploration',
                intent: 'explore_data',
                entities: [],
                confidence_score: 0.6,
                specificity_level: 'low',
                investigation_strategy: 'General data exploration',
                execution_plan: 'sequential',
                priority_order: [1]
            };
        }
    }

    _fallbackToolPlanning(queryAnalysis, availableTools) {
        const queryType = queryAnalysis.query_type || 'general';
        
        if (queryType === 'incident_analysis') {
            return availableTools.filter(tool => 
                ['search_logs', 'get_incidents', 'search_changelogs'].includes(tool)
            );
        } else {
            return availableTools.filter(tool => 
                ['get_database_stats', 'get_schema'].includes(tool)
            );
        }
    }

    _fallbackRoutingDecision(state) {
        const errorCount = state.error_count || 0;
        if (errorCount >= 3) {
            return 'error_recovery';
        }
        
        const queryType = state.query_type || '';
        if (queryType === 'incident_analysis') {
            return 'incident_analysis';
        }
        
        return 'response_enrichment';
    }

    _fallbackIncidentAnalysis(mcpResults) {
        return {
            root_causes: ['Unable to analyze without LLM'],
            correlations: [],
            timeline: [],
            affected_resources: [],
            confidence_score: 0.3,
            recommendations: ['Enable LLM integration for detailed analysis']
        };
    }

    _fallbackMultiQueryPlanning(queryAnalysis) {
        const subQueries = queryAnalysis.sub_queries || [queryAnalysis.intent || 'unknown'];
        
        const queryPlan = {};
        subQueries.forEach((subQuery, index) => {
            queryPlan[`query_${index + 1}`] = {
                query: subQuery,
                tools: ['get_database_stats', 'get_schema'],
                priority: index + 1,
                depends_on: []
            };
        });
        
        return {
            execution_type: 'sequential',
            query_plan: queryPlan,
            estimated_execution_time: '30',
            parallelization_opportunities: []
        };
    }

    _fallbackResponseGeneration(state) {
        return {
            final_response: 'Analysis completed. Enable LLM integration for enhanced responses.',
            forward_links: [],
            annotations: ['LLM unavailable - using basic response'],
            confidence: 0.5
        };
    }
}

// Global instance
const llmClient = new LLMDecisionMaker();
export default llmClient;