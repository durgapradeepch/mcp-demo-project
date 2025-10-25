/**
 * Intelligent Router for Tool Selection
 * 
 * This module provides battle-tested routing logic to select the correct tool
 * based on user intent. It uses a combination of:
 * 1. Keyword matching with priority levels
 * 2. Intent classification
 * 3. Entity extraction
 * 4. Fallback heuristics
 */

class IntelligentRouter {
  constructor() {
    // Tool categories with keywords and priority
    this.toolPatterns = {
      // VictoriaLogs Tools - HIGHEST PRIORITY for log queries
      victoriaLogs: {
        keywords: ['log', 'logs', 'victoria', 'logsql', 'log entry', 'log entries', 
                   'error log', 'access log', 'system log', 'application log'],
        excludeKeywords: ['changelog', 'node'], // Don't match these
        tools: {
          query_logs: {
            patterns: ['show.*log', 'get.*log', 'all log', 'recent log', 'latest log',
                      'display.*log', 'list.*log', 'view.*log', 'find.*log'],
            priority: 100
          },
          search_logs: {
            patterns: ['search.*log', 'find.*log.*contain', 'log.*error', 
                      'log.*exception', 'filter.*log', 'log.*level'],
            priority: 90
          },
          get_log_metrics: {
            patterns: ['log.*field', 'log.*metric', 'log.*stream', 'available.*log',
                      'log.*metadata', 'log.*properties'],
            priority: 80
          },
          get_log_stats: {
            patterns: ['log.*stat', 'log.*count', 'how many.*log', 'number.*log'],
            priority: 85
          }
        }
      },

      // Manifest API Tools - SECOND PRIORITY
      manifestAPI: {
        keywords: ['manifest', 'ticket', 'incident', 'changelog', 'notification', 
                   'resource', 'alert'],
        excludeKeywords: [],
        tools: {
          get_resource_by_id: {
            patterns: ['resource.*\\d+', 'resource id', 'resource details.*\\d+', 
                      'show.*resource.*\\d+', 'get.*resource.*\\d+', 'details.*resource.*\\d+',
                      'what.*resource.*\\d+', 'about.*resource.*\\d+', 'resource\\s+\\d+'],
            priority: 100
          },
          get_ticket_by_id: {
            patterns: ['ticket.*\\d+', 'ticket id', 'ticket details.*\\d+',
                      'show.*ticket.*\\d+', 'get.*ticket.*\\d+', 'details.*ticket.*\\d+',
                      'what.*ticket', 'about.*ticket'],
            priority: 100
          },
          get_incident_by_id: {
            patterns: ['incident.*\\d+', 'incident id', 'show.*incident.*\\d+',
                      'what.*incident', 'about.*incident', 'details.*incident'],
            priority: 100
          },
          get_changelog_by_id: {
            patterns: ['changelog.*\\d+', 'changelog id', 'change log.*\\d+',
                      'show.*changelog.*\\d+', 'what.*changelog', 'about.*changelog'],
            priority: 100
          },
          get_notification_by_id: {
            patterns: ['notification.*\\d+', 'notification id', 'alert.*\\d+',
                      'show.*notification.*\\d+', 'what.*notification', 'about.*notification'],
            priority: 100
          },
          get_tickets: {
            patterns: ['all.*ticket', 'list.*ticket', 'show.*ticket', 
                      'open.*ticket', 'closed.*ticket', 'ticket'],
            priority: 90
          },
          get_incidents: {
            patterns: ['all.*incident', 'list.*incident', 'show.*incident',
                      'active.*incident', 'incident'],
            priority: 90
          },
          get_changelogs: {
            patterns: ['all.*changelog', 'list.*changelog', 'recent.*change',
                      'changelog', 'change.*log'],
            priority: 90
          },
          get_resources: {
            patterns: ['all.*resource', 'list.*resource', 'show.*resource',
                      'cloud.*resource', 'infrastructure', 'every.*resource'],
            priority: 85
          },
          get_notifications: {
            patterns: ['all.*notification', 'list.*notification', 'recent.*alert',
                      'notification', 'alert'],
            priority: 85
          }
        }
      },

      // Neo4j Tools - THIRD PRIORITY
      neo4j: {
        keywords: ['neo4j', 'graph', 'cypher', 'node', 'relationship', 'database'],
        excludeKeywords: ['manifest.*graph'],
        tools: {
          get_schema: {
            patterns: ['schema', 'structure', 'model', 'what.*data', 'database.*structure',
                      'available.*type', 'data.*model'],
            priority: 70
          },
          get_node_count: {
            patterns: ['how many.*node', 'count.*node', 'number.*node', 'node.*count',
                      'total.*node'],
            priority: 85
          },
          get_database_stats: {
            patterns: ['statistic', 'stats', 'database.*stat', 'db.*stat', 'overview',
                      'summary', 'how many', 'count'],
            priority: 75
          },
          get_node_labels: {
            patterns: ['node.*label', 'label', 'node.*type', 'type.*node', 'what.*node'],
            priority: 70
          },
          get_relationship_types: {
            patterns: ['relationship.*type', 'relation.*type', 'connection.*type', 
                      'edge.*type', 'what.*relationship'],
            priority: 70
          },
          query_nodes: {
            patterns: ['query.*node', 'find.*node', 'get.*node', 'search.*node',
                      'node.*where', 'node.*with'],
            priority: 65
          },
          get_relationships: {
            patterns: ['relationship', 'relation', 'connection', 'link', 'edge',
                      'connected.*to', 'related.*to'],
            priority: 65
          }
        }
      }
    };
  }

  /**
   * Route a user prompt to the most appropriate tool
   * @param {string} prompt - User's natural language query
   * @returns {Object} - Routing decision with tool name, reasoning, and confidence
   */
  route(prompt) {
    const normalizedPrompt = prompt.toLowerCase().trim();
    
    console.log('🧭 Intelligent Router analyzing:', prompt);

    // Step 1: Check for explicit tool category mentions
    const categoryScores = this.scoreCategories(normalizedPrompt);
    
    // Step 2: Find best matching tool within categories
    const toolMatches = this.findToolMatches(normalizedPrompt, categoryScores);
    
    // Step 3: Select the highest priority match
    const bestMatch = this.selectBestTool(toolMatches);
    
    console.log('📊 Routing decision:', {
      tool: bestMatch.tool,
      confidence: bestMatch.confidence,
      category: bestMatch.category
    });

    return bestMatch;
  }

  /**
   * Score each category based on keyword matching
   */
  scoreCategories(prompt) {
    const scores = {};
    
    for (const [category, config] of Object.entries(this.toolPatterns)) {
      let score = 0;
      
      // Check for category keywords
      for (const keyword of config.keywords) {
        const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
        if (pattern.test(prompt)) {
          score += 10;
        }
      }
      
      // Penalize for excluded keywords
      for (const excludeKeyword of config.excludeKeywords) {
        const pattern = new RegExp(excludeKeyword, 'i');
        if (pattern.test(prompt)) {
          score -= 20;
        }
      }
      
      scores[category] = score;
    }
    
    return scores;
  }

  /**
   * Find matching tools within each category
   */
  findToolMatches(prompt, categoryScores) {
    const matches = [];
    
    for (const [category, config] of Object.entries(this.toolPatterns)) {
      const categoryScore = categoryScores[category] || 0;
      
      // Skip categories with negative scores
      if (categoryScore < 0) continue;
      
      for (const [toolName, toolConfig] of Object.entries(config.tools)) {
        let toolScore = categoryScore;
        
        // Check pattern matching
        for (const pattern of toolConfig.patterns) {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(prompt)) {
            toolScore += toolConfig.priority;
            break; // Only count first matching pattern
          }
        }
        
        // Only add if there's some score
        if (toolScore > 0) {
          matches.push({
            tool: toolName,
            category: category,
            score: toolScore,
            confidence: this.calculateConfidence(toolScore)
          });
        }
      }
    }
    
    return matches;
  }

  /**
   * Select the best tool from matches
   */
  selectBestTool(matches) {
    if (matches.length === 0) {
      // Ultimate fallback
      return {
        tool: 'get_schema',
        category: 'neo4j',
        confidence: 0.3,
        reasoning: 'No clear match found, defaulting to schema exploration',
        execution_plan: 'Will explore database schema to understand available data'
      };
    }
    
    // Sort by score (descending)
    matches.sort((a, b) => b.score - a.score);
    
    const best = matches[0];
    
    return {
      tool: best.tool,
      category: best.category,
      confidence: best.confidence,
      reasoning: `Selected ${best.tool} from ${best.category} category with score ${best.score}`,
      execution_plan: this.getExecutionPlan(best.tool)
    };
  }

  /**
   * Calculate confidence score (0.0 to 1.0)
   */
  calculateConfidence(score) {
    // Normalize score to 0.0 - 1.0 range
    const maxScore = 200; // Reasonable maximum score
    return Math.min(1.0, Math.max(0.0, score / maxScore));
  }

  /**
   * Get execution plan for a tool
   */
  getExecutionPlan(toolName) {
    const plans = {
      // VictoriaLogs
      query_logs: 'Execute LogSQL query to retrieve log entries',
      search_logs: 'Search logs with text filters and label matching',
      get_log_metrics: 'Retrieve available log fields and metadata',
      get_log_stats: 'Get log statistics and counts',
      
      // Manifest API
      get_tickets: 'Fetch service request tickets from Manifest API',
      get_incidents: 'Retrieve incident records from Manifest API',
      get_changelogs: 'Get change log entries from Manifest API',
      get_resources: 'Fetch cloud resources from Manifest API',
      get_notifications: 'Retrieve notifications from Manifest API',
      
      // Neo4j
      get_schema: 'Retrieve database schema with node labels, relationships, and properties',
      get_node_count: 'Count nodes in the database by label',
      get_database_stats: 'Get comprehensive database statistics',
      get_node_labels: 'Retrieve all node labels in the database',
      get_relationship_types: 'Get all relationship types',
      query_nodes: 'Query nodes with filters',
      get_relationships: 'Retrieve relationships between nodes'
    };
    
    return plans[toolName] || 'Execute the tool with default parameters';
  }

  /**
   * Extract parameters from prompt for the selected tool
   */
  extractParameters(prompt, toolName) {
    const params = {};
    const normalized = prompt.toLowerCase();
    
    // Common parameter extraction patterns
    
    // ========================================================================
    // ID EXTRACTION - CRITICAL FOR SPECIFIC RESOURCE/TICKET/INCIDENT QUERIES
    // ========================================================================
    
    // Extract resource_id (multiple patterns)
    if (toolName === 'get_resource_by_id' || toolName === 'get_resource_tickets' || 
        toolName === 'get_resource_version' || toolName === 'get_resource_metadata' ||
        toolName === 'get_changelog_by_resource' || toolName === 'get_changelog_list_by_resource' ||
        toolName === 'search_changelogs_by_resource_id' || toolName === 'get_notifications_by_resource') {
      
      const resourceIdPatterns = [
        /resource\s+(?:id\s+)?(\d+)/i,  // "resource 31077279" or "resource id 31077279"
        /resource\s+(\d+)/i,             // "resource 31077279"
        /rid[:\s]+(\d+)/i,               // "rid: 31077279" or "rid 31077279"
        /for\s+resource\s+(\d+)/i,       // "for resource 31077279"
        /about\s+resource\s+(\d+)/i,     // "about resource 31077279"
        /\bresource\s+(\d+)\b/i          // word boundary match
      ];
      
      for (const pattern of resourceIdPatterns) {
        const match = prompt.match(pattern);
        if (match && match[1]) {
          params.resource_id = match[1];
          console.log(`✅ Extracted resource_id: ${params.resource_id}`);
          break;
        }
      }
    }
    
    // Extract ticket_id
    if (toolName === 'get_ticket_by_id') {
      const ticketIdPatterns = [
        /ticket\s+(?:id\s+)?(\d+)/i,     // "ticket 123" or "ticket id 123"
        /ticket\s+([A-Z]+-\d+)/i,        // "ticket DAT-131"
        /tid[:\s]+(\S+)/i,               // "tid: 123" or "tid 123"
        /for\s+ticket\s+(\S+)/i,         // "for ticket 123"
        /about\s+ticket\s+(\S+)/i        // "about ticket 123"
      ];
      
      for (const pattern of ticketIdPatterns) {
        const match = prompt.match(pattern);
        if (match && match[1]) {
          params.ticket_id = match[1];
          console.log(`✅ Extracted ticket_id: ${params.ticket_id}`);
          break;
        }
      }
    }
    
    // Extract incident_id
    if (toolName === 'get_incident_by_id' || toolName === 'get_incident_changelogs' || 
        toolName === 'get_incident_curated') {
      const incidentIdPatterns = [
        /incident\s+(?:id\s+)?(\S+)/i,   // "incident INC-123" or "incident id INC-123"
        /iid[:\s]+(\S+)/i,               // "iid: 123"
        /for\s+incident\s+(\S+)/i,       // "for incident 123"
        /about\s+incident\s+(\S+)/i      // "about incident 123"
      ];
      
      for (const pattern of incidentIdPatterns) {
        const match = prompt.match(pattern);
        if (match && match[1]) {
          params.incident_id = match[1];
          console.log(`✅ Extracted incident_id: ${params.incident_id}`);
          break;
        }
      }
    }
    
    // Extract changelog_id
    if (toolName === 'get_changelog_by_id') {
      const changelogIdPatterns = [
        /changelog\s+(?:id\s+)?(\S+)/i,  // "changelog 123" or "changelog id 123"
        /change\s+log\s+(?:id\s+)?(\S+)/i,
        /cid[:\s]+(\S+)/i,               // "cid: 123"
        /for\s+changelog\s+(\S+)/i       // "for changelog 123"
      ];
      
      for (const pattern of changelogIdPatterns) {
        const match = prompt.match(pattern);
        if (match && match[1]) {
          params.changelog_id = match[1];
          console.log(`✅ Extracted changelog_id: ${params.changelog_id}`);
          break;
        }
      }
    }
    
    // Extract notification_id
    if (toolName === 'get_notification_by_id') {
      const notificationIdPatterns = [
        /notification\s+(?:id\s+)?(\d+)/i, // "notification 123"
        /alert\s+(?:id\s+)?(\d+)/i,        // "alert 123"
        /nid[:\s]+(\d+)/i,                 // "nid: 123"
        /for\s+notification\s+(\d+)/i      // "for notification 123"
      ];
      
      for (const pattern of notificationIdPatterns) {
        const match = prompt.match(pattern);
        if (match && match[1]) {
          params.notification_id = match[1];
          console.log(`✅ Extracted notification_id: ${params.notification_id}`);
          break;
        }
      }
    }
    
    // Extract rule_id for notification rules
    if (toolName === 'get_notification_rule') {
      const ruleIdMatch = prompt.match(/rule\s+(?:id\s+)?(\S+)/i);
      if (ruleIdMatch) {
        params.rule_id = ruleIdMatch[1];
        console.log(`✅ Extracted rule_id: ${params.rule_id}`);
      }
    }
    
    // ========================================================================
    // OTHER PARAMETERS
    // ========================================================================
    
    // Limit extraction
    const limitMatch = normalized.match(/(?:limit|top|first)\s+(\d+)/);
    if (limitMatch) {
      params.limit = parseInt(limitMatch[1]);
    }
    
    // Status extraction (for tickets/incidents)
    if (normalized.includes('open')) {
      params.status = 'open';
    } else if (normalized.includes('closed')) {
      params.status = 'closed';
    }
    
    // Log-specific parameters
    if (toolName === 'query_logs' || toolName === 'search_logs') {
      // Extract log level
      if (normalized.includes('error')) {
        params.query = 'level:ERROR';
      } else if (normalized.includes('warning') || normalized.includes('warn')) {
        params.query = 'level:WARNING';
      } else if (normalized.includes('info')) {
        params.query = 'level:INFO';
      } else {
        params.query = '*'; // All logs
      }
      
      if (!params.limit) {
        params.limit = 100; // Default limit for logs
      }
    }
    
    // Neo4j node label extraction
    const labelMatch = normalized.match(/\b(?:label|node type)[:\s]+(\w+)/i);
    if (labelMatch) {
      params.label = labelMatch[1];
    }
    
    return params;
  }
}

module.exports = IntelligentRouter;
