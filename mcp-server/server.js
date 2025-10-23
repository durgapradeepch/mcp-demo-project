const express = require('express');
const axios = require('axios');
const config = require('./config');



const app = express();
const PORT = config.SERVER_PORT;

// Initialize Llama API configuration
let llamaAvailable = false;
if (config.LLAMA_API_ENDPOINT && config.LLAMA_API_KEY) {
  llamaAvailable = true;
  console.log('✅ Llama API configured');
  console.log('   Endpoint:', config.LLAMA_API_ENDPOINT);
} else {
  console.warn('⚠️ Llama API not configured - AI features will use fallback mode');
}

// Helper function to call Llama API (matching Python format)
async function callLlamaAPI(messages, temperature = 0.05, max_tokens = 500) {
  try {
    const payload = {
      model: config.MODEL_NAME || "llama3",
      messages: messages,
      options: {
        temperature: temperature,
        max_tokens: max_tokens
      },
      stream: config.STREAM === 'true' ? true : false
    };
    
    console.log('🔍 Llama API Request:', JSON.stringify(payload, null, 2));
    
    const response = await axios.post(config.LLAMA_API_ENDPOINT, payload, {
      headers: {
        'Authorization': `Bearer ${config.LLAMA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000  // Increased to 120 seconds for LLM response
    });
    
    console.log('📥 Llama API Response:', JSON.stringify(response.data, null, 2));
    
    // Handle response format matching Python code
    if (response.data.message && response.data.message.content) {
      return response.data.message.content;
    } else if (response.data.response) {
      return response.data.response;
    } else if (response.data.content) {
      return response.data.content;
    } else {
      throw new Error('Unexpected response format from Chat API');
    }
  } catch (error) {
    console.error('❌ Llama API error:', error.response?.data || error.message);
    throw error;
  }
}

// MCP Tool Definitions
const MCP_TOOLS = {
  // Neo4j Tools
  get_node_labels: {
    name: "get_node_labels",
    description: "Get all node labels in the Neo4j database",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  get_relationship_types: {
    name: "get_relationship_types",
    description: "Get all relationship types in the Neo4j database",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  get_schema: {
    name: "get_schema",
    description: "Get the database schema including node labels, relationships, and properties",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  query_nodes: {
    name: "query_nodes",
    description: "Query nodes by label with optional property filters",
    inputSchema: {
      type: "object",
      properties: {
        label: {
          type: "string",
          description: "Node label to query (e.g., 'Person', 'Company')",
          required: true
        },
        properties: {
          type: "object",
          description: "Property filters (e.g., {name: 'John', age: 30})"
        },
        limit: {
          type: "integer",
          description: "Maximum number of nodes to return",
          default: 50
        }
      },
      required: ["label"]
    }
  },

  search_nodes: {
    name: "search_nodes",
    description: "Search nodes by property values using text matching",
    inputSchema: {
      type: "object",
      properties: {
        label: {
          type: "string",
          description: "Node label to search in"
        },
        property: {
          type: "string",
          description: "Property name to search in (e.g., 'name', 'description')",
          required: true
        },
        value: {
          type: "string",
          description: "Value to search for (supports partial matching)",
          required: true
        },
        limit: {
          type: "integer",
          description: "Maximum number of results to return",
          default: 50
        }
      },
      required: ["property", "value"]
    }
  },

  get_relationships: {
    name: "get_relationships",
    description: "Get relationships between nodes",
    inputSchema: {
      type: "object",
      properties: {
        from_label: {
          type: "string",
          description: "Source node label"
        },
        to_label: {
          type: "string",
          description: "Target node label"
        },
        relationship_type: {
          type: "string",
          description: "Relationship type to filter by"
        },
        limit: {
          type: "integer",
          description: "Maximum number of relationships to return",
          default: 50
        }
      }
    }
  },

  execute_cypher: {
    name: "execute_cypher",
    description: "Execute a custom Cypher query (use with caution)",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Cypher query to execute",
          required: true
        },
        parameters: {
          type: "object",
          description: "Query parameters"
        }
      },
      required: ["query"]
    }
  },

  get_node_count: {
    name: "get_node_count",
    description: "Get count of nodes by label",
    inputSchema: {
      type: "object",
      properties: {
        label: {
          type: "string",
          description: "Node label to count (optional - if not provided, counts all nodes)"
        }
      }
    }
  },

  get_database_stats: {
    name: "get_database_stats",
    description: "Get general database statistics",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  // VictoriaLogs Tools
  query_logs: {
    name: "query_logs",
    description: "Query logs from VictoriaLogs using LogSQL",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "LogSQL query to execute (e.g., 'level:ERROR', '_msg:error')",
          required: true
        },
        limit: {
          type: "integer",
          description: "Maximum number of log entries to return",
          default: 100
        }
      },
      required: ["query"]
    }
  },

  search_logs: {
    name: "search_logs",
    description: "Search logs by text content or label filters in VictoriaLogs",
    inputSchema: {
      type: "object",
      properties: {
        search_text: {
          type: "string",
          description: "Text to search for in log messages"
        },
        labels: {
          type: "object",
          description: "Label filters (e.g., {level: 'ERROR', object: 'TaskManager'})"
        },
        limit: {
          type: "integer",
          description: "Maximum number of log entries to return",
          default: 100
        }
      }
    }
  },

  get_log_metrics: {
    name: "get_log_metrics",
    description: "Get available log fields and streams from VictoriaLogs",
    inputSchema: {
      type: "object",
      properties: {
        metric_type: {
          type: "string",
          description: "Type of metadata to retrieve (fields or streams)",
          default: "fields"
        }
      }
    }
  },

  get_log_stats: {
    name: "get_log_stats",
    description: "Get log statistics and counts from VictoriaLogs",
    inputSchema: {
      type: "object", 
      properties: {
        query: {
          type: "string",
          description: "LogSQL query to get statistics for",
          default: "*"
        },
        limit: {
          type: "integer",
          description: "Maximum number of results",
          default: 50
        }
      }
    }
  },

  // Manifest API Tools
  get_changelogs: {
    name: "get_changelogs",
    description: "Get changelogs from Manifest API",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Maximum number of changelogs to return",
          default: 50
        },
        offset: {
          type: "integer",
          description: "Number of changelogs to skip",
          default: 0
        }
      }
    }
  },

  get_graph: {
    name: "get_graph",
    description: "Get graph data from Manifest API",
    inputSchema: {
      type: "object",
      properties: {
        graph_type: {
          type: "string",
          description: "Type of graph to retrieve"
        }
      }
    }
  },

  get_incidents: {
    name: "get_incidents",
    description: "Get incidents from Manifest API",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter by incident status (e.g., 'open', 'closed')"
        },
        limit: {
          type: "integer",
          description: "Maximum number of incidents to return",
          default: 50
        }
      }
    }
  },

  get_notifications: {
    name: "get_notifications",
    description: "Get notifications from Manifest API",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Maximum number of notifications to return",
          default: 50
        }
      }
    }
  },

  get_resources: {
    name: "get_resources",
    description: "Get resources from Manifest API",
    inputSchema: {
      type: "object",
      properties: {
        resource_type: {
          type: "string",
          description: "Filter by resource type"
        },
        limit: {
          type: "integer",
          description: "Maximum number of resources to return",
          default: 50
        }
      }
    }
  },

  get_tickets: {
    name: "get_tickets",
    description: "Get tickets from Manifest API",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter by ticket status"
        },
        limit: {
          type: "integer",
          description: "Maximum number of tickets to return",
          default: 50
        }
      }
    }
  },

  // Additional Resource Tools
  get_resource_by_id: {
    name: "get_resource_by_id",
    description: "Get a particular resource by resource ID",
    inputSchema: {
      type: "object",
      properties: {
        resource_id: {
          type: "string",
          description: "Resource ID",
          required: true
        }
      },
      required: ["resource_id"]
    }
  },

  get_resource_tickets: {
    name: "get_resource_tickets",
    description: "Get tickets for a resource with given ID",
    inputSchema: {
      type: "object",
      properties: {
        resource_id: {
          type: "string",
          description: "Resource ID",
          required: true
        }
      },
      required: ["resource_id"]
    }
  },

  search_resources: {
    name: "search_resources",
    description: "Search resources within an organization based on various filters",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query"
        },
        page: {
          type: "integer",
          description: "Page number for pagination",
          default: 1
        },
        page_size: {
          type: "integer",
          description: "Number of items per page",
          default: 20
        }
      }
    }
  },

  get_resource_version: {
    name: "get_resource_version",
    description: "Get version of resource by its ID",
    inputSchema: {
      type: "object",
      properties: {
        resource_id: {
          type: "string",
          description: "Resource ID",
          required: true
        }
      },
      required: ["resource_id"]
    }
  },

  get_resource_metadata: {
    name: "get_resource_metadata",
    description: "Get metadata of a resource",
    inputSchema: {
      type: "object",
      properties: {
        resource_id: {
          type: "string",
          description: "Resource ID",
          required: true
        }
      },
      required: ["resource_id"]
    }
  },

  // Additional Changelog Tools
  get_changelog_by_id: {
    name: "get_changelog_by_id",
    description: "Get change log entry with given ID",
    inputSchema: {
      type: "object",
      properties: {
        changelog_id: {
          type: "string",
          description: "Changelog ID",
          required: true
        }
      },
      required: ["changelog_id"]
    }
  },

  search_changelogs: {
    name: "search_changelogs",
    description: "Search and retrieve change log entries with filters",
    inputSchema: {
      type: "object",
      properties: {
        severity: {
          type: "string",
          description: "Filter by severity"
        },
        provider_key: {
          type: "string",
          description: "Filter by provider key"
        },
        description: {
          type: "string",
          description: "Filter by description"
        },
        page: {
          type: "integer",
          description: "Page number",
          default: 1
        },
        page_size: {
          type: "integer",
          description: "Page size",
          default: 20
        }
      }
    }
  },

  get_changelog_by_resource: {
    name: "get_changelog_by_resource",
    description: "Get change logs of resource with given ID (with version)",
    inputSchema: {
      type: "object",
      properties: {
        resource_id: {
          type: "string",
          description: "Resource ID",
          required: true
        }
      },
      required: ["resource_id"]
    }
  },

  get_changelog_list_by_resource: {
    name: "get_changelog_list_by_resource",
    description: "Get change logs of resource with given ID (without version)",
    inputSchema: {
      type: "object",
      properties: {
        resource_id: {
          type: "string",
          description: "Resource ID",
          required: true
        }
      },
      required: ["resource_id"]
    }
  },

  search_changelogs_by_event_type: {
    name: "search_changelogs_by_event_type",
    description: "Search change log entries with associated event types",
    inputSchema: {
      type: "object",
      properties: {
        event_type: {
          type: "string",
          description: "Filter by event type"
        },
        severity: {
          type: "string",
          description: "Filter by severity"
        },
        page: {
          type: "integer",
          description: "Page number",
          default: 1
        },
        page_size: {
          type: "integer",
          description: "Page size",
          default: 20
        }
      }
    }
  },

  search_changelogs_by_resource_id: {
    name: "search_changelogs_by_resource_id",
    description: "Search change log entries by resource ID",
    inputSchema: {
      type: "object",
      properties: {
        resource_id: {
          type: "string",
          description: "Resource ID to search for",
          required: true
        },
        severity: {
          type: "string",
          description: "Filter by severity"
        },
        page: {
          type: "integer",
          description: "Page number",
          default: 1
        },
        page_size: {
          type: "integer",
          description: "Page size",
          default: 20
        }
      },
      required: ["resource_id"]
    }
  },

  // Additional Notification Tools
  get_notification_by_id: {
    name: "get_notification_by_id",
    description: "Retrieve a specific notification by ID",
    inputSchema: {
      type: "object",
      properties: {
        notification_id: {
          type: "string",
          description: "Notification ID",
          required: true
        }
      },
      required: ["notification_id"]
    }
  },

  get_notification_rule: {
    name: "get_notification_rule",
    description: "Get a notification rule by rule ID",
    inputSchema: {
      type: "object",
      properties: {
        rule_id: {
          type: "string",
          description: "Rule ID",
          required: true
        }
      },
      required: ["rule_id"]
    }
  },

  get_notifications_by_resource: {
    name: "get_notifications_by_resource",
    description: "Get all notifications for a particular resource ID",
    inputSchema: {
      type: "object",
      properties: {
        resource_id: {
          type: "string",
          description: "Resource ID",
          required: true
        }
      },
      required: ["resource_id"]
    }
  },

  // Additional Ticket Tools
  get_ticket_by_id: {
    name: "get_ticket_by_id",
    description: "Get a ticket by ID",
    inputSchema: {
      type: "object",
      properties: {
        ticket_id: {
          type: "string",
          description: "Ticket ID",
          required: true
        }
      },
      required: ["ticket_id"]
    }
  },

  search_tickets: {
    name: "search_tickets",
    description: "Search and retrieve service request records with filters",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Filter by title"
        },
        type: {
          type: "string",
          description: "Filter by type"
        },
        priority: {
          type: "string",
          description: "Filter by priority"
        },
        status: {
          type: "string",
          description: "Filter by status"
        },
        severity: {
          type: "string",
          description: "Filter by severity"
        },
        page: {
          type: "integer",
          description: "Page number",
          default: 1
        },
        page_size: {
          type: "integer",
          description: "Page size",
          default: 20
        }
      }
    }
  },

  // Additional Incident Tools
  get_incident_by_id: {
    name: "get_incident_by_id",
    description: "Get a particular incident with a given ID",
    inputSchema: {
      type: "object",
      properties: {
        incident_id: {
          type: "string",
          description: "Incident ID",
          required: true
        }
      },
      required: ["incident_id"]
    }
  },

  get_incident_changelogs: {
    name: "get_incident_changelogs",
    description: "Get the change logs for an incident with given ID",
    inputSchema: {
      type: "object",
      properties: {
        incident_id: {
          type: "string",
          description: "Incident ID",
          required: true
        }
      },
      required: ["incident_id"]
    }
  },

  get_incident_curated: {
    name: "get_incident_curated",
    description: "Get the curated incident in organization with ID",
    inputSchema: {
      type: "object",
      properties: {
        incident_id: {
          type: "string",
          description: "Incident ID",
          required: true
        }
      },
      required: ["incident_id"]
    }
  },

  search_incidents: {
    name: "search_incidents",
    description: "Search and retrieve incident records with filters",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Filter by title"
        },
        priority: {
          type: "string",
          description: "Filter by priority"
        },
        status: {
          type: "string",
          description: "Filter by status"
        },
        severity: {
          type: "string",
          description: "Filter by severity"
        },
        page: {
          type: "integer",
          description: "Page number",
          default: 1
        },
        page_size: {
          type: "integer",
          description: "Page size",
          default: 20
        }
      }
    }
  },

  // Graph Tools
  get_graph_nodes: {
    name: "get_graph_nodes",
    description: "Retrieve nodes and their relationships from Manifest graph",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  get_graph_by_label: {
    name: "get_graph_by_label",
    description: "Retrieve nodes and relationships by specific label (faster than get_graph)",
    inputSchema: {
      type: "object",
      properties: {
        label: {
          type: "string",
          description: "Node label to filter by",
          required: true
        }
      },
      required: ["label"]
    }
  },

  create_graph_link: {
    name: "create_graph_link",
    description: "Link two nodes in Graph",
    inputSchema: {
      type: "object",
      properties: {
        from_node: {
          type: "string",
          description: "Source node ID",
          required: true
        },
        to_node: {
          type: "string",
          description: "Target node ID",
          required: true
        },
        relationship_type: {
          type: "string",
          description: "Type of relationship",
          required: true
        }
      },
      required: ["from_node", "to_node", "relationship_type"]
    }
  },

  execute_graph_cypher: {
    name: "execute_graph_cypher",
    description: "Execute a Cypher query on Manifest graph",
    inputSchema: {
      type: "object",
      properties: {
        cypher_query: {
          type: "string",
          description: "Cypher query to execute",
          required: true
        }
      },
      required: ["cypher_query"]
    }
  }
};

// MCP Tool Registry
class MCPToolRegistry {
  constructor() {
    this.tools = new Map();
    this.registerTools();
  }

  registerTools() {
    // Register Neo4j tools
    this.tools.set('get_node_labels', this.getNodeLabels.bind(this));
    this.tools.set('get_relationship_types', this.getRelationshipTypes.bind(this));
    this.tools.set('get_schema', this.getSchema.bind(this));
    this.tools.set('query_nodes', this.queryNodes.bind(this));
    this.tools.set('search_nodes', this.searchNodes.bind(this));
    this.tools.set('get_relationships', this.getRelationships.bind(this));
    this.tools.set('execute_cypher', this.executeCypherTool.bind(this));
    this.tools.set('get_node_count', this.getNodeCount.bind(this));
    this.tools.set('get_database_stats', this.getDatabaseStats.bind(this));
    
    // Register VictoriaLogs tools
    this.tools.set('query_logs', this.queryLogs.bind(this));
    this.tools.set('search_logs', this.searchLogs.bind(this));
    this.tools.set('get_log_metrics', this.getLogMetrics.bind(this));
    this.tools.set('get_log_stats', this.getLogStats.bind(this));
    
    // Register Manifest API tools
    this.tools.set('get_changelogs', this.getChangelogs.bind(this));
    this.tools.set('get_graph', this.getGraph.bind(this));
    this.tools.set('get_incidents', this.getIncidents.bind(this));
    this.tools.set('get_notifications', this.getNotifications.bind(this));
    this.tools.set('get_resources', this.getResources.bind(this));
    this.tools.set('get_tickets', this.getTickets.bind(this));
    
    // Register additional Manifest API Resource tools
    this.tools.set('get_resource_by_id', this.getResourceById.bind(this));
    this.tools.set('get_resource_tickets', this.getResourceTickets.bind(this));
    this.tools.set('search_resources', this.searchResources.bind(this));
    this.tools.set('get_resource_version', this.getResourceVersion.bind(this));
    this.tools.set('get_resource_metadata', this.getResourceMetadata.bind(this));
    
    // Register additional Changelog tools
    this.tools.set('get_changelog_by_id', this.getChangelogById.bind(this));
    this.tools.set('search_changelogs', this.searchChangelogs.bind(this));
    this.tools.set('get_changelog_by_resource', this.getChangelogByResource.bind(this));
    this.tools.set('get_changelog_list_by_resource', this.getChangelogListByResource.bind(this));
    this.tools.set('search_changelogs_by_event_type', this.searchChangelogsByEventType.bind(this));
    this.tools.set('search_changelogs_by_resource_id', this.searchChangelogsByResourceId.bind(this));
    
    // Register additional Notification tools
    this.tools.set('get_notification_by_id', this.getNotificationById.bind(this));
    this.tools.set('get_notification_rule', this.getNotificationRule.bind(this));
    this.tools.set('get_notifications_by_resource', this.getNotificationsByResource.bind(this));
    
    // Register additional Ticket tools
    this.tools.set('get_ticket_by_id', this.getTicketById.bind(this));
    this.tools.set('search_tickets', this.searchTickets.bind(this));
    
    // Register additional Incident tools
    this.tools.set('get_incident_by_id', this.getIncidentById.bind(this));
    this.tools.set('get_incident_changelogs', this.getIncidentChangelogs.bind(this));
    this.tools.set('get_incident_curated', this.getIncidentCurated.bind(this));
    this.tools.set('search_incidents', this.searchIncidents.bind(this));
    
    // Register Graph tools
    this.tools.set('get_graph_nodes', this.getGraphNodes.bind(this));
    this.tools.set('get_graph_by_label', this.getGraphByLabel.bind(this));
    this.tools.set('create_graph_link', this.createGraphLink.bind(this));
    this.tools.set('execute_graph_cypher', this.executeGraphCypher.bind(this));
  }

  // Get available tools
  getAvailableTools() {
    return Object.values(MCP_TOOLS);
  }

  // Execute a tool
  async executeTool(toolName, parameters) {
    if (!this.tools.has(toolName)) {
      throw new Error(`Tool '${toolName}' not found`);
    }

    const tool = this.tools.get(toolName);
    return await tool(parameters);
  }

  // Neo4j tool implementations
  async getNodeLabels() {
    try {
      const result = await executeCypher('CALL db.labels()');
      const labels = result.data.map(record => record.row[0]);
      return {
        labels: labels,
        count: labels.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get node labels: ${error.message}`);
    }
  }

  async getRelationshipTypes() {
    try {
      const result = await executeCypher('CALL db.relationshipTypes()');
      const types = result.data.map(record => record.row[0]);
      return {
        relationship_types: types,
        count: types.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get relationship types: ${error.message}`);
    }
  }

  async getSchema() {
    try {
      // Get node labels
      const labelsResult = await executeCypher('CALL db.labels()');
      const labels = labelsResult.data.map(record => record.row[0]);

      // Get relationship types
      const relsResult = await executeCypher('CALL db.relationshipTypes()');
      const relationshipTypes = relsResult.data.map(record => record.row[0]);

      // Get property keys
      const propsResult = await executeCypher('CALL db.propertyKeys()');
      const propertyKeys = propsResult.data.map(record => record.row[0]);

      // Get schema information
      const schemaResult = await executeCypher('CALL db.schema.visualization()');
      
      return {
        node_labels: labels,
        relationship_types: relationshipTypes,
        property_keys: propertyKeys,
        labels_count: labels.length,
        relationships_count: relationshipTypes.length,
        properties_count: propertyKeys.length,
        schema_details: schemaResult.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get schema: ${error.message}`);
    }
  }

  async queryNodes(params) {
    const { label, properties = {}, limit = 50 } = params;
    
    try {
      let query = `MATCH (n:${label})`;
      let queryParams = { limit };
      
      // Add property filters if provided
      if (Object.keys(properties).length > 0) {
        const conditions = Object.keys(properties).map((key, index) => {
          queryParams[`prop${index}`] = properties[key];
          return `n.${key} = $prop${index}`;
        });
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ' RETURN n LIMIT $limit';
      
      const result = await executeCypher(query, queryParams);
      const nodes = result.data.map(record => record.row[0]);
      
      return {
        label: label,
        nodes: nodes,
        count: nodes.length,
        filters: properties,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to query nodes: ${error.message}`);
    }
  }

  async searchNodes(params) {
    const { label, property, value, limit = 50 } = params;
    
    try {
      let query;
      let queryParams = { value, limit };
      
      if (label) {
        query = `MATCH (n:${label}) WHERE n.${property} CONTAINS $value RETURN n LIMIT $limit`;
      } else {
        query = `MATCH (n) WHERE n.${property} CONTAINS $value RETURN n, labels(n) as node_labels LIMIT $limit`;
      }
      
      const result = await executeCypher(query, queryParams);
      const nodes = result.data.map(record => ({
        node: record.row[0],
        labels: record.row[1] || [label]
      }));
      
      return {
        search_property: property,
        search_value: value,
        target_label: label,
        nodes: nodes,
        count: nodes.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to search nodes: ${error.message}`);
    }
  }

  async getRelationships(params = {}) {
    const { from_label, to_label, relationship_type, limit = 50 } = params;
    
    try {
      let query = 'MATCH (a)-[r]->(b)';
      let conditions = [];
      let queryParams = { limit };
      
      if (from_label) {
        conditions.push(`a:${from_label}`);
      }
      if (to_label) {
        conditions.push(`b:${to_label}`);
      }
      if (relationship_type) {
        query = query.replace('[r]', `[r:${relationship_type}]`);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ' RETURN a, type(r) as relationship_type, r, b, labels(a) as from_labels, labels(b) as to_labels LIMIT $limit';
      
      const result = await executeCypher(query, queryParams);
      const relationships = result.data.map(record => ({
        from_node: record.row[0],
        from_labels: record.row[4],
        relationship_type: record.row[1],
        relationship_properties: record.row[2],
        to_node: record.row[3],
        to_labels: record.row[5]
      }));
      
      return {
        relationships: relationships,
        count: relationships.length,
        filters: { from_label, to_label, relationship_type },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get relationships: ${error.message}`);
    }
  }

  async executeCypherTool(params) {
    const { query, parameters = {} } = params;
    
    try {
      // Security check - prevent destructive operations
      const lowerQuery = query.toLowerCase().trim();
      if (lowerQuery.includes('delete') || lowerQuery.includes('remove') || 
          lowerQuery.includes('detach delete') || lowerQuery.includes('drop')) {
        throw new Error('Destructive operations (DELETE, REMOVE, DROP) are not allowed');
      }
      
      const result = await executeCypher(query, parameters);
      
      return {
        query: query,
        parameters: parameters,
        columns: result.columns || [],
        data: result.data || [],
        row_count: result.data ? result.data.length : 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to execute Cypher query: ${error.message}`);
    }
  }

  async getNodeCount(params = {}) {
    const { label } = params;
    
    try {
      let query;
      if (label) {
        query = `MATCH (n:${label}) RETURN count(n) as count`;
      } else {
        query = 'MATCH (n) RETURN count(n) as count';
      }
      
      const result = await executeCypher(query);
      const count = result.data[0].row[0];
      
      return {
        label: label || 'all_nodes',
        count: count,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get node count: ${error.message}`);
    }
  }

  async getDatabaseStats() {
    try {
      // Get total node count
      const nodeCountResult = await executeCypher('MATCH (n) RETURN count(n) as count');
      const totalNodes = nodeCountResult.data[0].row[0];
      
      // Get total relationship count
      const relCountResult = await executeCypher('MATCH ()-[r]->() RETURN count(r) as count');
      const totalRelationships = relCountResult.data[0].row[0];
      
      // Get node labels count
      const labelsResult = await executeCypher('CALL db.labels()');
      const labelCount = labelsResult.data.length;
      
      // Get relationship types count
      const relTypesResult = await executeCypher('CALL db.relationshipTypes()');
      const relTypeCount = relTypesResult.data.length;
      
      // Get property keys count
      const propsResult = await executeCypher('CALL db.propertyKeys()');
      const propCount = propsResult.data.length;
      
      return {
        total_nodes: totalNodes,
        total_relationships: totalRelationships,
        node_labels_count: labelCount,
        relationship_types_count: relTypeCount,
        property_keys_count: propCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get database stats: ${error.message}`);
    }
  }

  // VictoriaLogs tool implementations
  async queryLogs(params) {
    const { query, limit = 100 } = params;
    
    try {
      // VictoriaLogs uses LogSQL syntax, not PromQL
      // Build the request parameters
      const requestParams = {
        query: query,
        limit: limit
      };
      
      // Check if query contains a timestamp filter and extract it
      const timestampMatch = query.match(/_time:([0-9TZ\-:.]+)/i);
      if (timestampMatch) {
        // Extract timestamp and use it for time range filtering
        const timestamp = timestampMatch[1];
        // VictoriaLogs accepts 'start' and 'end' parameters for time filtering
        // For a specific timestamp, search around that time (±1 second)
        const targetTime = new Date(timestamp);
        const startTime = new Date(targetTime.getTime() - 1000); // 1 second before
        const endTime = new Date(targetTime.getTime() + 1000);   // 1 second after
        
        requestParams.start = startTime.toISOString();
        requestParams.end = endTime.toISOString();
        // Remove _time from query since we're using time range params
        requestParams.query = query.replace(/_time:[^\s]+\s*/i, '').trim() || '*';
        
        console.log('📅 Time range query:', {
          start: requestParams.start,
          end: requestParams.end,
          query: requestParams.query
        });
      }
      
      const response = await axios.get(`${VICTORIA_LOGS_API_URL}/query`, {
        params: requestParams,
        timeout: 30000
      });
      
      // VictoriaLogs returns newline-delimited JSON (NDJSON), not a JSON array
      let logs = [];
      if (typeof response.data === 'string') {
        // Split by newlines and parse each JSON object
        const lines = response.data.trim().split('\n');
        logs = lines.map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            return null;
          }
        }).filter(log => log !== null);
      } else if (Array.isArray(response.data)) {
        logs = response.data;
      } else {
        logs = [response.data];
      }
      
      return {
        query: query,
        count: logs.length,
        logs: logs,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('VictoriaLogs query error details:', error.response?.data || error.message);
      throw new Error(`VictoriaLogs query failed: ${error.response?.data?.error || error.message}`);
    }
  }

  async searchLogs(params) {
    const { search_text, labels = {}, limit = 100 } = params;
    
    try {
      let query = '';
      
      // Build LogSQL query based on search parameters
      if (search_text) {
        // Search for text in log content using LogSQL syntax
        query = `_msg:${search_text}`;
      } else if (Object.keys(labels).length > 0) {
        // Search by labels using LogSQL syntax
        const labelSelectors = Object.entries(labels)
          .map(([key, value]) => `${key}:${value}`)
          .join(' AND ');
        query = labelSelectors;
      } else {
        // Default query to get recent logs
        query = '*';
      }
      
      const response = await axios.get(`${VICTORIA_LOGS_API_URL}/query`, {
        params: {
          query: query,
          limit: limit
        },
        timeout: 30000
      });
      
      // VictoriaLogs returns newline-delimited JSON (NDJSON)
      let logs = [];
      if (typeof response.data === 'string') {
        // Split by newlines and parse each JSON object
        const lines = response.data.trim().split('\n');
        logs = lines.map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            return null;
          }
        }).filter(log => log !== null);
      } else if (Array.isArray(response.data)) {
        logs = response.data;
      } else {
        logs = [response.data];
      }
      
      return {
        search_text: search_text,
        labels: labels,
        count: logs.length,
        logs: logs,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`VictoriaLogs search failed: ${error.message}`);
    }
  }

  async getLogMetrics(params) {
    const { metric_type = 'fields' } = params;
    
    try {
      // VictoriaLogs has different endpoints for metadata
      let endpoint;
      switch (metric_type.toLowerCase()) {
        case 'fields':
          endpoint = '/fields';
          break;
        case 'streams':
          endpoint = '/streams';
          break;
        default:
          endpoint = '/fields';
      }
      
      const response = await axios.get(`${VICTORIA_LOGS_API_URL}${endpoint}`, {
        timeout: 30000
      });
      
      // VictoriaLogs returns different format than Prometheus
      return {
        metric_type: metric_type,
        data: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`VictoriaLogs metadata query failed: ${error.message}`);
    }
  }

  async getLogStats(params) {
    const { query = '*', limit = 50 } = params;
    
    try {
      const response = await axios.get(`${VICTORIA_LOGS_API_URL}/query`, {
        params: {
          query: query,
          limit: limit
        },
        timeout: 30000
      });
      
      // VictoriaLogs returns newline-delimited JSON (NDJSON)
      let logs = [];
      if (typeof response.data === 'string') {
        // Split by newlines and parse each JSON object
        const lines = response.data.trim().split('\n');
        logs = lines.map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            return null;
          }
        }).filter(log => log !== null);
      } else if (Array.isArray(response.data)) {
        logs = response.data;
      } else {
        logs = [response.data];
      }
      
      return {
        query: query,
        count: logs.length,
        logs: logs,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`VictoriaLogs stats query failed: ${error.message}`);
    }
  }

  // Helper method to parse time inputs
  parseTimeInput(timeInput) {
    if (!timeInput || timeInput === 'now') {
      return Math.floor(Date.now() / 1000);
    }
    
    // Handle relative time (e.g., "1h", "30m", "1d")
    const relativeTimeMatch = timeInput.match(/^(\d+)([smhd])$/);
    if (relativeTimeMatch) {
      const value = parseInt(relativeTimeMatch[1]);
      const unit = relativeTimeMatch[2];
      const now = Math.floor(Date.now() / 1000);
      
      switch (unit) {
        case 's': return now - value;
        case 'm': return now - (value * 60);
        case 'h': return now - (value * 3600);
        case 'd': return now - (value * 86400);
        default: return now - 3600; // Default to 1 hour
      }
    }
    
    // Handle Unix timestamp
    if (/^\d+$/.test(timeInput)) {
      return parseInt(timeInput);
    }
    
    // Handle RFC3339/ISO 8601 format
    try {
      return Math.floor(new Date(timeInput).getTime() / 1000);
    } catch (error) {
      // Fallback to 1 hour ago
      return Math.floor(Date.now() / 1000) - 3600;
    }
  }

  // Manifest API Tool Methods
  async getChangelogs(params) {
    const { limit = 50, offset = 0 } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/changelog`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        params: { limit, offset },
        timeout: 30000
      });
      
      return {
        changelogs: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        limit,
        offset,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API changelogs failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getGraph(params) {
    const { graph_type } = params;
    
    try {
      const url = graph_type 
        ? `${MANIFEST_API_URL}/client/graph/${graph_type}`
        : `${MANIFEST_API_URL}/client/graph`;
        
      const response = await axios.get(url, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        graph_type: graph_type || 'default',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API graph failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getIncidents(params) {
    const { status, limit = 50 } = params;
    
    try {
      console.log('🔍 Calling Manifest API:', `${MANIFEST_API_URL}/client/incident`);
      console.log('🔑 Using API Key:', config.MANIFEST_API_KEY ? 'Present' : 'Missing');
      
      const response = await axios.get(`${MANIFEST_API_URL}/client/incident`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        params: { status, limit },
        timeout: 30000
      });
      
      return {
        incidents: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        filter_status: status,
        limit,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Manifest API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.response?.statusText || error.message;
      
      if (errorMsg.includes('invalidated') || errorMsg.includes('not meant for')) {
        throw new Error(`Manifest API authentication failed: ${errorMsg}. Please verify your API key is valid and generated for the correct organization.`);
      }
      
      throw new Error(`Manifest API incidents failed: ${errorMsg}`);
    }
  }

  async getNotifications(params) {
    const { limit = 50 } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/notification`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        params: { limit },
        timeout: 30000
      });
      
      return {
        notifications: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        limit,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API notifications failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getResources(params) {
    const { resource_type, limit = 50 } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/resource`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        params: { resource_type, limit },
        timeout: 30000
      });
      
      return {
        resources: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        resource_type,
        limit,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API resources failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getTickets(params) {
    const { status, limit = 50 } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/ticket`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        params: { status, limit },
        timeout: 30000
      });
      
      return {
        tickets: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        filter_status: status,
        limit,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API tickets failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Additional Resource Methods
  async getResourceById(params) {
    const { resource_id } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/resource/${resource_id}`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        resource: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API get resource by ID failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getResourceTickets(params) {
    const { resource_id } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/resource/${resource_id}/ticket`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        resource_id,
        tickets: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API get resource tickets failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async searchResources(params) {
    const { query, page = 1, page_size = 20 } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/resource/search`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        params: { query, page, page_size },
        timeout: 30000
      });
      
      return {
        resources: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        page,
        page_size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API search resources failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getResourceVersion(params) {
    const { resource_id } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/resource/${resource_id}/version`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        resource_id,
        version: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API get resource version failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getResourceMetadata(params) {
    const { resource_id } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/resource/${resource_id}/metadata`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        resource_id,
        metadata: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API get resource metadata failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Additional Changelog Methods
  async getChangelogById(params) {
    const { changelog_id } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/changelog/${changelog_id}`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        changelog: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API get changelog by ID failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async searchChangelogs(params) {
    const { severity, provider_key, description, page = 1, page_size = 20 } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/changelog/search`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        params: { severity, provider_key, description, page, page_size },
        timeout: 30000
      });
      
      return {
        changelogs: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        page,
        page_size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API search changelogs failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getChangelogByResource(params) {
    const { resource_id } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/changelog/resource/${resource_id}`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        resource_id,
        changelogs: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API get changelog by resource failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getChangelogListByResource(params) {
    const { resource_id } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/changelog/resource/${resource_id}/list`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        resource_id,
        changelogs: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API get changelog list by resource failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async searchChangelogsByEventType(params) {
    const { event_type, severity, page = 1, page_size = 20 } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/changelog/search/event_type`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        params: { event_type, severity, page, page_size },
        timeout: 30000
      });
      
      return {
        event_type,
        changelogs: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        page,
        page_size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API search changelogs by event type failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async searchChangelogsByResourceId(params) {
    const { resource_id, severity, page = 1, page_size = 20 } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/changelog/search/resource_id`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        params: { resource_id, severity, page, page_size },
        timeout: 30000
      });
      
      return {
        resource_id,
        changelogs: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        page,
        page_size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API search changelogs by resource ID failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Additional Notification Methods
  async getNotificationById(params) {
    const { notification_id } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/notification/${notification_id}`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        notification: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API get notification by ID failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getNotificationRule(params) {
    const { rule_id } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/notification/rule/${rule_id}`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        rule: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API get notification rule failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getNotificationsByResource(params) {
    const { resource_id } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/notification/resource/${resource_id}`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        resource_id,
        notifications: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API get notifications by resource failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Additional Ticket Methods
  async getTicketById(params) {
    const { ticket_id } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/ticket/${ticket_id}`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        ticket: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API get ticket by ID failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async searchTickets(params) {
    const { title, type, priority, status, severity, page = 1, page_size = 20 } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/ticket/search`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        params: { title, type, priority, status, severity, page, page_size },
        timeout: 30000
      });
      
      return {
        tickets: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        page,
        page_size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API search tickets failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Additional Incident Methods
  async getIncidentById(params) {
    const { incident_id } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/incident/${incident_id}`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        incident: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API get incident by ID failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getIncidentChangelogs(params) {
    const { incident_id } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/incident/${incident_id}/changelogs`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        incident_id,
        changelogs: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API get incident changelogs failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getIncidentCurated(params) {
    const { incident_id } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/incident/${incident_id}/curated`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        incident_id,
        curated_incident: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API get curated incident failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async searchIncidents(params) {
    const { title, priority, status, severity, page = 1, page_size = 20 } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/incident/search`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        params: { title, priority, status, severity, page, page_size },
        timeout: 30000
      });
      
      return {
        incidents: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        page,
        page_size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API search incidents failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Graph Methods
  async getGraphNodes(params) {
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/graph`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        graph: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API get graph nodes failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getGraphByLabel(params) {
    const { label } = params;
    
    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/graph/${label}`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        label,
        graph: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API get graph by label failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async createGraphLink(params) {
    const { from_node, to_node, relationship_type } = params;
    
    try {
      const response = await axios.post(`${MANIFEST_API_URL}/client/graph`, {
        from_node,
        to_node,
        relationship_type
      }, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        from_node,
        to_node,
        relationship_type,
        result: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API create graph link failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async executeGraphCypher(params) {
    const { cypher_query } = params;
    
    try {
      const response = await axios.post(`${MANIFEST_API_URL}/client/graph/cypher`, {
        query: cypher_query
      }, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      return {
        query: cypher_query,
        result: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API execute graph cypher failed: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Initialize MCP Tool Registry
const mcpRegistry = new MCPToolRegistry();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Neo4j configuration
const NEO4J_CONFIG = config.NEO4J_CONFIG;
const NEO4J_URL = `http://${NEO4J_CONFIG.host}:7474`; // HTTP interface for Cypher queries
const NEO4J_USER = NEO4J_CONFIG.username;
const NEO4J_PASS = NEO4J_CONFIG.password;
const NEO4J_DATABASE = NEO4J_CONFIG.database;

// VictoriaLogs configuration
const VICTORIA_METRICS_URL = config.VICTORIA_METRICS_URL;
const VICTORIA_LOGS_API_URL = config.VICTORIA_LOGS_API_URL;

// Manifest API configuration
const MANIFEST_API_URL = config.MANIFEST_API_URL;
const MANIFEST_API_KEY = config.MANIFEST_API_KEY;

// Debug: Log Manifest API configuration on startup
console.log('🔧 Manifest API Configuration:');
console.log('   URL:', MANIFEST_API_URL);
console.log('   API Key:', MANIFEST_API_KEY ? `${MANIFEST_API_KEY.substring(0, 20)}...` : 'NOT LOADED');

// Function to execute Cypher queries via HTTP API
async function executeCypher(query, params = {}) {
  try {
    const response = await axios.post(`${NEO4J_URL}/db/${NEO4J_DATABASE}/tx/commit`, {
      statements: [{
        statement: query,
        parameters: params
      }]
    }, {
      auth: {
        username: NEO4J_USER,
        password: NEO4J_PASS
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response.data.errors && response.data.errors.length > 0) {
      throw new Error(response.data.errors[0].message);
    }
    
    return response.data.results[0];
  } catch (error) {
    console.error('Neo4j query error:', error.message);
    throw error;
  }
}

// Function to test Neo4j connection
async function testNeo4jConnection() {
  try {
    console.log('Testing Neo4j connection...');
    const result = await executeCypher('RETURN "Neo4j connection successful" as message');
    console.log('✅ Neo4j connection successful');
    return true;
  } catch (error) {
    console.error('❌ Neo4j connection failed:', error.message);
    console.error('Please ensure Neo4j is running and credentials are correct');
    return false;
  }
}

// MCP Tool Discovery Endpoint
app.get('/api/mcp/tools', (req, res) => {
  try {
    res.json({
      tools: mcpRegistry.getAvailableTools(),
      mcp_version: "1.0.0",
      server_info: "VictoriaLogs MCP Server"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MCP Tool Execution Endpoint
app.post('/api/mcp/execute', async (req, res) => {
  try {
    const { tool_name, parameters = {} } = req.body;
    
    if (!tool_name) {
      return res.status(400).json({ error: 'tool_name is required' });
    }
    
    const result = await mcpRegistry.executeTool(tool_name, parameters);
    
    res.json({
      success: true,
      tool_name,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      tool_name: req.body.tool_name 
    });
  }
});

// AI execution endpoint - uses OpenAI for intelligent prompt understanding
app.post('/api/ai-execute', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('🤖 AI Agent processing prompt:', prompt);

    let aiAnalysis = null;
    let actionPlan = null;

    // Try to use Llama API first (if available)
    if (llamaAvailable) {
      try {
      // Create a system message that explains the available MCP tools
      const systemMessage = `You are an AI agent that helps users interact with both a Neo4j graph database and VictoriaLogs for log querying.

Available Neo4j Tools:
1. get_node_labels - Get all node labels in the database
2. get_relationship_types - Get all relationship types
3. get_schema - Get database schema including labels, relationships, and properties
4. query_nodes - Query nodes by label with optional property filters
5. search_nodes - Search nodes by property values using text matching
6. get_relationships - Get relationships between nodes with optional filters
7. execute_cypher - Execute custom Cypher queries (read-only)
8. get_node_count - Get count of nodes by label
9. get_database_stats - Get general database statistics

Available VictoriaLogs Tools:
10. query_logs - Execute LogSQL queries against log data
11. search_logs - Search logs by text content or label filters
12. get_log_metrics - Get available log fields and streams
13. get_log_stats - Get log statistics and counts

Available Manifest API Tools:
14. get_changelogs - Get changelogs from Manifest API
15. get_graph - Get graph data from Manifest API
16. get_incidents - Get incidents from Manifest API
17. get_notifications - Get notifications from Manifest API
18. get_resources - Get resources from Manifest API
19. get_tickets - Get tickets from Manifest API

IMPORTANT ROUTING RULES:
1. If the user mentions "neo4j", "graph", "cypher", "nodes", "relationships", or asks about database structure → Use Neo4j tools
2. If the user mentions "logs", "victoria", "logsql", "log entries" → Use VictoriaLogs tools
3. If the user mentions "changelogs", "incidents", "tickets", "notifications", "resources", "manifest" → Use Manifest API tools
4. Questions like "how many nodes", "count nodes", "database stats" → Use get_database_stats or get_node_count (Neo4j)
5. Questions like "show me logs", "error logs", "log statistics" → Use VictoriaLogs tools
6. Questions like "show incidents", "get tickets", "changelogs", "resources" → Use Manifest API tools

Your job is to:
1. Understand what the user wants (graph data from Neo4j or logs from VictoriaLogs)
2. Decide which tools to call based on the request
3. For graph queries, start with schema exploration if you don't know the structure
4. Return the result in this format:
   {
     "action": "what you're doing",
     "tools": ["list of tool names to call"],
     "reasoning": "why you chose these tools",
     "execution_plan": "step by step plan"
   }

For Neo4j queries: Use graph database tools. Start with get_schema or get_node_labels to understand structure.
For log queries: Use VictoriaLogs tools with LogSQL syntax.
For general database exploration: Use get_schema, get_node_labels, get_database_stats.`;

      // Get AI analysis of the prompt using Llama API
      const messages = [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ];
      
      aiAnalysis = await callLlamaAPI(messages, 0.3, 500);
      console.log('🧠 AI Analysis:', aiAnalysis);

      // Parse the AI response to extract the action plan
      try {
        // Try to extract JSON from the AI response
        const jsonMatch = aiAnalysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          actionPlan = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: create a basic action plan
          actionPlan = {
            action: "explore_database",
            tools: ["get_schema"],
            reasoning: "AI provided analysis but no clear action plan, exploring database structure",
            execution_plan: "Will get database schema to understand available data"
          };
        }
      } catch (parseError) {
        console.log('⚠️ Could not parse AI response as JSON, using fallback');
        actionPlan = {
          action: "explore_database",
          tools: ["get_schema"],
          reasoning: "AI provided analysis but response format was unclear",
          execution_plan: "Will explore database structure to help with the request"
        };
        }
      } catch (aiError) {
        console.log('⚠️ Llama API error, using fallback system:', aiError.message);
        llamaAvailable = false; // Disable for this session if error occurs
      }
    }
    
    // Fallback system if Llama API is not available
    if (!llamaAvailable || !actionPlan) {
      console.log('⚠️ Using intelligent fallback system');
      // Fallback: intelligent pattern matching without AI
      aiAnalysis = "AI service temporarily unavailable. Using intelligent fallback system.";
      
      const lowerPrompt = prompt.toLowerCase();
      
      // First priority: Check if user explicitly mentions neo4j (for Neo4j queries)
      const explicitlyNeo4j = lowerPrompt.includes('neo4j') || (lowerPrompt.includes('graph') && !lowerPrompt.includes('manifest')) || lowerPrompt.includes('cypher');
      
      // Check for Manifest API queries
      const isManifestAPI = lowerPrompt.includes('manifest') || lowerPrompt.includes('changelog') || 
                           lowerPrompt.includes('incident') || lowerPrompt.includes('ticket') || 
                           lowerPrompt.includes('notification') || lowerPrompt.includes('resource');
      
      // Check for Manifest API queries first
      if (isManifestAPI) {
        if (lowerPrompt.includes('changelog')) {
          actionPlan = {
            action: "get_changelogs",
            tools: ["get_changelogs"],
            reasoning: "User wants to retrieve changelogs",
            execution_plan: "Fetch changelogs from Manifest API"
          };
        } else if (lowerPrompt.includes('incident')) {
          actionPlan = {
            action: "get_incidents",
            tools: ["get_incidents"],
            reasoning: "User wants to retrieve incidents",
            execution_plan: "Fetch incidents from Manifest API"
          };
        } else if (lowerPrompt.includes('ticket')) {
          actionPlan = {
            action: "get_tickets",
            tools: ["get_tickets"],
            reasoning: "User wants to retrieve tickets",
            execution_plan: "Fetch tickets from Manifest API"
          };
        } else if (lowerPrompt.includes('notification')) {
          actionPlan = {
            action: "get_notifications",
            tools: ["get_notifications"],
            reasoning: "User wants to retrieve notifications",
            execution_plan: "Fetch notifications from Manifest API"
          };
        } else if (lowerPrompt.includes('resource')) {
          actionPlan = {
            action: "get_resources",
            tools: ["get_resources"],
            reasoning: "User wants to retrieve resources",
            execution_plan: "Fetch resources from Manifest API"
          };
        } else if (lowerPrompt.includes('graph') && lowerPrompt.includes('manifest')) {
          actionPlan = {
            action: "get_graph",
            tools: ["get_graph"],
            reasoning: "User wants to retrieve graph data from Manifest",
            execution_plan: "Fetch graph data from Manifest API"
          };
        }
      } else if (!explicitlyNeo4j && (lowerPrompt.includes('victoria') || (lowerPrompt.includes('log') && !lowerPrompt.includes('node')) || lowerPrompt.includes('logsql'))) {
        // Check for log-related queries (but only if not explicitly Neo4j or Manifest)
        if (lowerPrompt.includes('error') || lowerPrompt.includes('exception') || lowerPrompt.includes('fail')) {
          actionPlan = {
            action: "search_error_logs",
            tools: ["search_logs"],
            reasoning: "User wants to find error logs",
            execution_plan: "Search logs for error-related content"
          };
        } else if (lowerPrompt.includes('metric') || lowerPrompt.includes('stat') || lowerPrompt.includes('available') || lowerPrompt.includes('field')) {
          actionPlan = {
            action: "get_log_metrics",
            tools: ["get_log_metrics"],
            reasoning: "User wants to see available log metrics",
            execution_plan: "Retrieve available log metrics and fields"
          };
        } else {
          actionPlan = {
            action: "query_logs",
            tools: ["query_logs"],
            reasoning: "User wants to query logs",
            execution_plan: "Execute LogSQL query for logs"
          };
        }
      } else if (lowerPrompt.includes('schema') || lowerPrompt.includes('structure') || lowerPrompt.includes('labels') || lowerPrompt.includes('what') && lowerPrompt.includes('data')) {
        actionPlan = {
          action: "explore_database_schema",
          tools: ["get_schema"],
          reasoning: "User wants to understand database structure",
          execution_plan: "Get database schema and structure information"
        };
      } else if (lowerPrompt.includes('node') || lowerPrompt.includes('nodes')) {
        actionPlan = {
          action: "explore_nodes",
          tools: ["get_node_labels"],
          reasoning: "User wants to explore nodes in the database",
          execution_plan: "Get available node labels and explore node data"
        };
      } else if (lowerPrompt.includes('relationship') || lowerPrompt.includes('connection') || lowerPrompt.includes('relation')) {
        actionPlan = {
          action: "explore_relationships",
          tools: ["get_relationship_types"],
          reasoning: "User wants to explore relationships",
          execution_plan: "Get relationship types and explore connections"
        };
      } else if (lowerPrompt.includes('count') || lowerPrompt.includes('how many') || lowerPrompt.includes('statistics') || lowerPrompt.includes('stats')) {
        actionPlan = {
          action: "get_database_statistics",
          tools: ["get_database_stats"],
          reasoning: "User wants database statistics",
          execution_plan: "Get comprehensive database statistics"
        };
      } else if (lowerPrompt.includes('search') || lowerPrompt.includes('find')) {
        actionPlan = {
          action: "explore_database_schema",
          tools: ["get_schema"],
          reasoning: "User wants to search, first need to understand data structure",
          execution_plan: "Get database schema to understand what can be searched"
        };
      } else {
        actionPlan = {
          action: "explore_database",
          tools: ["get_schema"],
          reasoning: "General inquiry, exploring database structure",
          execution_plan: "Get database schema to understand available data"
        };
      }
    }

    // Execute the action plan based on the AI's analysis or fallback
    let result;
    let message;
    let feedback = 'Operation completed successfully';
    let formattedResult = null;

    // Check if we have a valid action plan from AI
    if (actionPlan && actionPlan.action && actionPlan.tools && actionPlan.tools.length > 0) {
      const action = actionPlan.action.toLowerCase();
      const toolToCall = actionPlan.tools[0]; // Execute the first recommended tool
      
      try {
        // Route based on the tool name suggested by AI
        if (toolToCall.startsWith('get_') && (toolToCall.includes('changelog') || toolToCall.includes('incident') || 
            toolToCall.includes('ticket') || toolToCall.includes('notification') || toolToCall.includes('resource') || 
            (toolToCall.includes('graph') && action.includes('manifest')))) {
          // Manifest API operations
          result = await mcpRegistry.executeTool(toolToCall, {});
          message = `Successfully retrieved data from Manifest API using ${toolToCall}`;
          feedback = `Retrieved data from Manifest API`;
        } else if (toolToCall.includes('log') || action.includes('log') || action.includes('victoria')) {
          // VictoriaLogs operations
          if (action.includes('error') || action.includes('search_error_logs')) {
            result = await mcpRegistry.executeTool('search_logs', {
              search_text: 'error',
              limit: 50
            });
            message = `Found error logs from VictoriaLogs`;
            feedback = `Successfully searched for error logs`;
          } else if (action.includes('metric') || action.includes('get_log_metrics')) {
            result = await mcpRegistry.executeTool('get_log_metrics', {
              metric_type: 'fields'
            });
            message = `Retrieved available log fields from VictoriaLogs`;
            feedback = `Successfully retrieved log metadata`;
          } else {
            // General log search
            let query = '*';
            
            // Check for timestamp in the prompt
            const timestampMatch = prompt.match(/timestamp[:\s]+["\']?([0-9TZ\-:.]+)["\']?/i) || 
                                  prompt.match(/time[:\s]+["\']?([0-9TZ\-:.]+)["\']?/i) ||
                                  prompt.match(/([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.0-9]*Z)/i);
            
            if (timestampMatch) {
              const timestamp = timestampMatch[1];
              // VictoriaLogs uses _time field for timestamp filtering
              query = `_time:${timestamp}`;
              console.log('📅 Timestamp query detected:', query);
            } else {
              // Check for text search
              const searchText = prompt.match(/logs?\s+(?:containing|with|for)\s+[\"\']?([^\"\']+)[\"\']?/i);
              if (searchText) {
                query = `_msg:${searchText[1]}`;
              } else if (prompt.toLowerCase().includes('error')) {
                query = 'level:ERROR';
              }
            }
            
            result = await mcpRegistry.executeTool('query_logs', {
              query: query,
              limit: 50
            });
            message = `Retrieved logs from VictoriaLogs`;
            feedback = `Successfully searched logs with query: ${query}`;
          }
        } else {
          // Neo4j operations - execute the suggested tool
          result = await mcpRegistry.executeTool(toolToCall, {});
          message = `Successfully executed ${toolToCall} on Neo4j database`;
          feedback = `Retrieved data from Neo4j using ${toolToCall}`;
        }
        
        // Format the result using LLM if Llama API is available
        if (llamaAvailable) {
          try {
            const formatPrompt = `You are ChatGPT responding to a user question. Convert this database result into a natural, conversational response.

Data: ${JSON.stringify(result, null, 2)}

Rules:
- Write ONLY plain text, NO markdown (no **, no #, no bullet points)
- Be conversational and friendly like ChatGPT
- Don't say "Here's the summary" or "Database Update Summary"
- Just naturally explain what the data shows
- For a node count of 5379, say something like: "Your database has 5,379 nodes in total."
- Keep it brief and clear (2-3 sentences max)
- Don't mention technical fields like "timestamp" or "label" unless the user asked about them
- Sound natural and human`;

            const formatMessages = [
              { role: "system", content: "You are ChatGPT. Respond naturally without any markdown formatting. Just plain conversational text." },
              { role: "user", content: formatPrompt }
            ];
            
            formattedResult = await callLlamaAPI(formatMessages, 0.7, 200);
            console.log('📝 Formatted result:', formattedResult);
          } catch (formatError) {
            console.log('⚠️ Could not format result with LLM:', formatError.message);
            // Continue without formatted result
          }
        }
      } catch (error) {
        message = `Query failed: ${error.message}`;
        feedback = `Error: ${error.message}`;
        result = { error: error.message };
      }
    } else {
      // Fallback when no clear action plan - default to Neo4j stats
      try {
        result = await mcpRegistry.executeTool('get_database_stats', {});
        message = `Retrieved Neo4j database statistics`;
        feedback = `Successfully retrieved database stats`;
        
        // Format the result using LLM
        if (llamaAvailable) {
          try {
            const formatPrompt = `You are ChatGPT responding to a user question. Convert this database result into a natural, conversational response.

Data: ${JSON.stringify(result, null, 2)}

Rules:
- Write ONLY plain text, NO markdown
- Be conversational and friendly
- Just naturally explain what the data shows
- Keep it brief (2-3 sentences)
- Sound natural and human`;

            const formatMessages = [
              { role: "system", content: "You are ChatGPT. Respond naturally without any markdown formatting. Just plain conversational text." },
              { role: "user", content: formatPrompt }
            ];
            
            formattedResult = await callLlamaAPI(formatMessages, 0.7, 200);
          } catch (formatError) {
            console.log('⚠️ Could not format result with LLM:', formatError.message);
          }
        }
      } catch (error) {
        message = `Failed to retrieve data: ${error.message}`;
        feedback = `Error retrieving data: ${error.message}`;
        result = { error: error.message };
      }
    }

    res.json({
      message: formattedResult || message,
      details: result,
      ai_analysis: aiAnalysis,
      action_plan: actionPlan,
      feedback: feedback,
      fallback_mode: !aiAnalysis || aiAnalysis.includes('fallback'),
      formatted_text: formattedResult
    });

  } catch (error) {
    console.error('AI execution error:', error);
    res.status(500).json({ 
      error: `Failed to execute prompt: ${error.message}`,
      suggestion: 'Please check your prompt format and try again.',
      fallback_mode: true
    });
  }
});

// Start Express server
app.listen(PORT, () => {
  console.log(`🚀 VictoriaLogs MCP Server running on port ${PORT}`);
  console.log(`🔗 Neo4j Bolt connection at: bolt://${NEO4J_CONFIG.host}:${NEO4J_CONFIG.port}`);
  console.log(`📊 Access VictoriaLogs at: ${VICTORIA_METRICS_URL}`);
  console.log(`🎨 Frontend should connect to: http://localhost:3001`);
  console.log(`🤖 MCP Tools available at /api/mcp/tools`);
  console.log(`⚡ MCP Tool execution at /api/mcp/execute`);
  console.log(`🧠 AI execution endpoint at /api/ai-execute`);

  console.log(`📊 Available VictoriaLogs Tools: query_logs, search_logs, get_log_metrics, get_log_stats`);
  console.log(`🔧 Available Manifest API Tools: get_changelogs, get_graph, get_incidents, get_notifications, get_resources, get_tickets`);
  
  // Test Neo4j connection on startup
  setTimeout(() => {
    testNeo4jConnection();
  }, 2000); // Wait 2 seconds for Neo4j to be ready
});
