const express = require('express');
const axios = require('axios');
const config = require('./config');

const app = express();
const PORT = config.SERVER_PORT;

// Initialize LLM configuration
let llmAvailable = false;
let llmChoice = config.LLM_CHOICE || 'llama';

if (llmChoice === 'openai' && config.OPENAI_API_KEY) {
  llmAvailable = true;
  console.log('✅ OpenAI API configured');
  console.log('   Model:', config.MODEL_NAME || 'gpt-4o-mini');
} else if (llmChoice === 'llama' && config.LLAMA_API_ENDPOINT && config.LLAMA_API_KEY) {
  llmAvailable = true;
  console.log('✅ Llama API configured');
  console.log('   Endpoint:', config.LLAMA_API_ENDPOINT);
} else {
  console.warn('⚠️ No LLM configured - AI features will use fallback mode');
}

// Unified LLM API caller - supports both OpenAI and Llama
async function callLLM(messages, temperature = 0.05, max_tokens = 500) {
  if (llmChoice === 'openai') {
    return await callOpenAI(messages, temperature, max_tokens);
  } else {
    return await callLlamaAPI(messages, temperature, max_tokens);
  }
}

// OpenAI API caller
async function callOpenAI(messages, temperature = 0.05, max_tokens = 500) {
  try {
    const payload = {
      model: config.MODEL_NAME || "gpt-4o-mini",
      messages: messages,
      temperature: temperature,
      max_tokens: max_tokens
    };

    console.log('🔍 OpenAI API Request:', JSON.stringify(payload, null, 2));

    const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
      headers: {
        'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });

    console.log('📥 OpenAI API Response:', JSON.stringify(response.data, null, 2));

    if (response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      return response.data.choices[0].message.content;
    } else {
      throw new Error('Unexpected response format from OpenAI API');
    }
  } catch (error) {
    console.error('❌ OpenAI API error:', error.response?.data || error.message);
    throw error;
  }
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
    description: "Retrieve all available node labels (types) in the Neo4j graph database. Use this to discover what kinds of nodes exist in the database.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  get_relationship_types: {
    name: "get_relationship_types",
    description: "Retrieve all relationship types that exist in the Neo4j graph database. Use this to discover what kinds of connections exist between nodes.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  get_schema: {
    name: "get_schema",
    description: "Get complete Neo4j database schema overview including all node labels, relationship types, and property keys. Use this for comprehensive schema understanding.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  query_nodes: {
    name: "query_nodes",
    description: "Query Neo4j nodes by specific label with optional exact property matching. Use this when you need nodes of a specific type with exact property values (e.g., name='John').",
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
          description: "Property filters for exact matching (e.g., {name: 'John', age: 30})"
        }
      },
      required: ["label"]
    }
  },

  search_nodes: {
    name: "search_nodes",
    description: "Search Neo4j nodes using partial text matching on property values. Use this when you need fuzzy/partial matching (e.g., property contains 'Joh'). Better for text searches.",
    inputSchema: {
      type: "object",
      properties: {
        label: {
          type: "string",
          description: "Node label to search in (optional)"
        },
        property: {
          type: "string",
          description: "Property name to search in (e.g., 'name', 'description')",
          required: true
        },
        value: {
          type: "string",
          description: "Text value to search for (supports partial/substring matching)",
          required: true
        }
      },
      required: ["property", "value"]
    }
  },

  get_relationships: {
    name: "get_relationships",
    description: "Query Neo4j relationships (edges/connections) between nodes. Filter by source label, target label, or relationship type. Use this to explore graph connections.",
    inputSchema: {
      type: "object",
      properties: {
        from_label: {
          type: "string",
          description: "Source node label to filter by"
        },
        to_label: {
          type: "string",
          description: "Target node label to filter by"
        },
        relationship_type: {
          type: "string",
          description: "Relationship type to filter by (e.g., 'WORKS_AT', 'KNOWS')"
        }
      }
    }
  },

  execute_cypher: {
    name: "execute_cypher",
    description: "Execute a custom Cypher query directly on Neo4j database. Use ONLY for advanced queries that cannot be accomplished with other tools. Read-only queries preferred.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Cypher query to execute (destructive operations blocked)",
          required: true
        },
        parameters: {
          type: "object",
          description: "Query parameters for parameterized queries"
        }
      },
      required: ["query"]
    }
  },

  get_node_count: {
    name: "get_node_count",
    description: "Get total count of nodes in Neo4j database, optionally filtered by a specific label. Use this for statistics and overview.",
    inputSchema: {
      type: "object",
      properties: {
        label: {
          type: "string",
          description: "Node label to count (if not provided, counts all nodes)"
        }
      }
    }
  },

  get_database_stats: {
    name: "get_database_stats",
    description: "Get comprehensive Neo4j database statistics including total nodes, relationships, labels, relationship types, and property keys. Use for database overview.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  // VictoriaLogs Tools
  query_logs: {
    name: "query_logs",
    description: "Execute a LogSQL query on VictoriaLogs to retrieve log entries. Use this for structured queries with LogSQL syntax (e.g., 'level:ERROR', '_msg:error').",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "LogSQL query string (e.g., 'level:ERROR AND _msg:database')",
          required: true
        }
      },
      required: ["query"]
    }
  },

  search_logs: {
    name: "search_logs",
    description: "Search VictoriaLogs by free text or label filters. Use this for simple text searches in log messages or when filtering by specific labels (level, object, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        search_text: {
          type: "string",
          description: "Free text to search for in log messages"
        },
        labels: {
          type: "object",
          description: "Label filters as key-value pairs (e.g., {level: 'ERROR', object: 'TaskManager'})"
        }
      }
    }
  },

  get_log_metrics: {
    name: "get_log_metrics",
    description: "Get available log field names and stream information from VictoriaLogs metadata. Use this to discover what fields and streams are available for querying.",
    inputSchema: {
      type: "object",
      properties: {
        metric_type: {
          type: "string",
          description: "Type of metadata: 'fields' for field names or 'streams' for stream info",
          default: "fields"
        }
      }
    }
  },

  get_log_stats: {
    name: "get_log_stats",
    description: "Get statistical summary and counts for log entries matching a LogSQL query. Use this for log analytics and aggregations.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "LogSQL query to get statistics for (default: '*' for all logs)",
          default: "*"
        }
      }
    }
  },

  // Manifest API Tools
  get_changelogs: {
    name: "get_changelogs",
    description: "Get a list of ALL changelogs from Manifest API without filtering. Use this for general changelog browsing.",
    inputSchema: {
      type: "object",
      properties: {
        offset: {
          type: "integer",
          description: "Number of changelogs to skip for pagination",
          default: 0
        }
      }
    }
  },

  get_graph: {
    name: "get_graph",
    description: "Retrieve graph visualization data from Manifest API. Optionally filter by graph_type. Use this for topology and dependency mapping.",
    inputSchema: {
      type: "object",
      properties: {
        graph_type: {
          type: "string",
          description: "Type of graph to retrieve (optional filter)"
        }
      }
    }
  },

  get_incidents: {
    name: "get_incidents",
    description: "Retrieve incidents from Manifest API. Filter by status (open/closed). Use this for incident management and tracking.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter by incident status: 'open', 'closed', 'resolved', etc."
        }
      }
    }
  },

  get_notifications: {
    name: "get_notifications",
    description: "Retrieve notification records from Manifest API. Use this to get alerts, warnings, and system notifications.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  get_resources: {
    name: "get_resources",
    description: "Retrieve resource inventory from Manifest API. Filter by resource_type (e.g., 'VM', 'Container', 'Database'). Use for asset management and discovery.",
    inputSchema: {
      type: "object",
      properties: {
        resource_type: {
          type: "string",
          description: "Filter by resource type/category"
        }
      }
    }
  },

  get_tickets: {
    name: "get_tickets",
    description: "Retrieve service tickets/requests from Manifest API. Filter by status. Use for ticket management and tracking.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter by ticket status: 'open', 'closed', 'pending', etc."
        }
      }
    }
  },

  // Additional Resource Tools
  get_resource_by_id: {
    name: "get_resource_by_id",
    description: "Get detailed information for a single specific resource by its unique resource ID. Use when you have an exact resource_id to lookup.",
    inputSchema: {
      type: "object",
      properties: {
        resource_id: {
          type: "string",
          description: "Unique resource identifier",
          required: true
        }
      },
      required: ["resource_id"]
    }
  },

  get_resource_tickets: {
    name: "get_resource_tickets",
    description: "Get all service tickets associated with a specific resource ID. Use to find tickets related to a particular resource/asset.",
    inputSchema: {
      type: "object",
      properties: {
        resource_id: {
          type: "string",
          description: "Resource ID to get tickets for",
          required: true
        }
      },
      required: ["resource_id"]
    }
  },

  search_resources: {
    name: "search_resources",
    description: "Search resources using text query with pagination. Use for finding resources by name, description, or other searchable fields.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query text/keyword"
        },
        page: {
          type: "integer",
          description: "Page number for pagination (starts at 1)",
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
    description: "Get version information for a specific resource by its ID. Use to track resource versioning and changes.",
    inputSchema: {
      type: "object",
      properties: {
        resource_id: {
          type: "string",
          description: "Resource ID to get version for",
          required: true
        }
      },
      required: ["resource_id"]
    }
  },

  get_resource_metadata: {
    name: "get_resource_metadata",
    description: "Get detailed metadata and configuration for a specific resource. Use to retrieve tags, properties, and extended attributes.",
    inputSchema: {
      type: "object",
      properties: {
        resource_id: {
          type: "string",
          description: "Resource ID to get metadata for",
          required: true
        }
      },
      required: ["resource_id"]
    }
  },

  // Additional Changelog Tools
  get_changelog_by_id: {
    name: "get_changelog_by_id",
    description: "Get a single specific changelog entry by its unique changelog ID (NOT resource ID). Use when you have a changelog_id parameter.",
    inputSchema: {
      type: "object",
      properties: {
        changelog_id: {
          type: "string",
          description: "Changelog ID (not resource ID)",
          required: true
        }
      },
      required: ["changelog_id"]
    }
  },

  search_changelogs: {
    name: "search_changelogs",
    description: "Search and filter change log entries by severity, provider, or description. Use for advanced filtering across all changelogs.",
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
    description: "Get detailed change logs for a specific resource ID including version information. Returns changelog entries WITH version data for the resource.",
    inputSchema: {
      type: "object",
      properties: {
        resource_id: {
          type: "string",
          description: "Resource ID to get changelogs for",
          required: true
        }
      },
      required: ["resource_id"]
    }
  },

  get_changelog_list_by_resource: {
    name: "get_changelog_list_by_resource",
    description: "Get a simplified list of changelogs for a specific resource ID WITHOUT version information. Use this for basic changelog lists by resource. Endpoint: /resource/{id}/list",
    inputSchema: {
      type: "object",
      properties: {
        resource_id: {
          type: "string",
          description: "Resource ID to get changelog list for",
          required: true
        }
      },
      required: ["resource_id"]
    }
  },

  search_changelogs_by_event_type: {
    name: "search_changelogs_by_event_type",
    description: "Search and filter change log entries by event type classification (e.g., 'deployment', 'configuration_change'). Use when filtering by event category.",
    inputSchema: {
      type: "object",
      properties: {
        event_type: {
          type: "string",
          description: "Event type to filter by (e.g., 'deployment', 'update')"
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
    description: "Advanced search for changelogs by resource ID with additional filtering by severity and pagination. Use when you need filtered search results for a resource.",
    inputSchema: {
      type: "object",
      properties: {
        resource_id: {
          type: "string",
          description: "Resource ID to search changelogs for",
          required: true
        },
        severity: {
          type: "string",
          description: "Optional severity filter"
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
    description: "Retrieve a single specific notification by its unique notification ID. Use when you have an exact notification_id.",
    inputSchema: {
      type: "object",
      properties: {
        notification_id: {
          type: "string",
          description: "Unique notification identifier",
          required: true
        }
      },
      required: ["notification_id"]
    }
  },

  get_notification_rule: {
    name: "get_notification_rule",
    description: "Get configuration details for a specific notification rule by rule ID. Use to review notification rule settings and conditions.",
    inputSchema: {
      type: "object",
      properties: {
        rule_id: {
          type: "string",
          description: "Notification rule identifier",
          required: true
        }
      },
      required: ["rule_id"]
    }
  },

  get_notifications_by_resource: {
    name: "get_notifications_by_resource",
    description: "Get all notifications related to a specific resource ID. Use to find all alerts/notifications for a particular resource/asset.",
    inputSchema: {
      type: "object",
      properties: {
        resource_id: {
          type: "string",
          description: "Resource ID to get notifications for",
          required: true
        }
      },
      required: ["resource_id"]
    }
  },

  // Additional Ticket Tools
  get_ticket_by_id: {
    name: "get_ticket_by_id",
    description: "Retrieve a single specific service ticket by its unique ticket ID. Use when you have an exact ticket_id to lookup.",
    inputSchema: {
      type: "object",
      properties: {
        ticket_id: {
          type: "string",
          description: "Unique ticket identifier",
          required: true
        }
      },
      required: ["ticket_id"]
    }
  },

  search_tickets: {
    name: "search_tickets",
    description: "Search and filter service tickets using multiple criteria (title, type, priority, status, severity). Use for advanced ticket filtering with pagination.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Filter by ticket title (partial match)"
        },
        type: {
          type: "string",
          description: "Filter by ticket type (e.g., 'incident', 'request')"
        },
        priority: {
          type: "string",
          description: "Filter by priority level (e.g., 'high', 'medium', 'low')"
        },
        status: {
          type: "string",
          description: "Filter by status (e.g., 'open', 'in_progress', 'closed')"
        },
        severity: {
          type: "string",
          description: "Filter by severity level"
        },
        page: {
          type: "integer",
          description: "Page number for pagination",
          default: 1
        },
        page_size: {
          type: "integer",
          description: "Results per page",
          default: 20
        }
      }
    }
  },

  // Additional Incident Tools
  get_incident_by_id: {
    name: "get_incident_by_id",
    description: "Retrieve a single specific incident by its unique incident ID. Use when you have an exact incident_id to lookup.",
    inputSchema: {
      type: "object",
      properties: {
        incident_id: {
          type: "string",
          description: "Unique incident identifier",
          required: true
        }
      },
      required: ["incident_id"]
    }
  },

  get_incident_changelogs: {
    name: "get_incident_changelogs",
    description: "Get all changelog entries associated with a specific incident ID. Use to track what changes are related to an incident.",
    inputSchema: {
      type: "object",
      properties: {
        incident_id: {
          type: "string",
          description: "Incident ID to get changelogs for",
          required: true
        }
      },
      required: ["incident_id"]
    }
  },

  get_incident_curated: {
    name: "get_incident_curated",
    description: "Get curated/analyzed incident data with additional context and insights for a specific incident ID. Use for detailed incident investigation.",
    inputSchema: {
      type: "object",
      properties: {
        incident_id: {
          type: "string",
          description: "Incident ID to get curated data for",
          required: true
        }
      },
      required: ["incident_id"]
    }
  },

  search_incidents: {
    name: "search_incidents",
    description: "Search and filter incidents using multiple criteria (title, priority, status, severity). Use for advanced incident filtering with pagination.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Filter by incident title (partial match)"
        },
        priority: {
          type: "string",
          description: "Filter by priority level (e.g., 'critical', 'high', 'medium', 'low')"
        },
        status: {
          type: "string",
          description: "Filter by status (e.g., 'open', 'investigating', 'resolved', 'closed')"
        },
        severity: {
          type: "string",
          description: "Filter by severity level (e.g., 'sev1', 'sev2')"
        },
        page: {
          type: "integer",
          description: "Page number for pagination",
          default: 1
        },
        page_size: {
          type: "integer",
          description: "Results per page",
          default: 20
        }
      }
    }
  },

  // Graph Tools
  get_graph_nodes: {
    name: "get_graph_nodes",
    description: "Retrieve all nodes and their relationships from the Manifest graph database. Use this to explore the entire graph structure, discover all available nodes and their interconnections. No filters applied - returns complete graph topology. Best for understanding overall system architecture and resource dependencies. Endpoint: /graph",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  get_graph_by_label: {
    name: "get_graph_by_label",
    description: "Retrieve nodes and relationships filtered by a specific node label (e.g., 'Resource', 'Service', 'Component'). Use this when you want to focus on a particular type of node in the graph. Much faster than get_graph_nodes when you only need specific node types. Returns filtered subgraph with only matching labeled nodes and their relationships. Endpoint: /graph/{label}",
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
    description: "Create a new relationship link between two existing nodes in the Manifest graph. Use this to establish connections between resources, services, or components. Requires valid source node ID, target node ID, and relationship type. Use for building or updating graph topology, establishing dependencies, or creating service connections. Endpoint: POST /graph/link",
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
    description: "Execute a custom Cypher query directly on the Manifest graph database. Use this for complex graph traversals, pattern matching, or advanced queries that cannot be handled by other graph tools. Requires knowledge of Cypher query language. Use for complex analysis like finding shortest paths, detecting cycles, or performing multi-hop relationship queries. Most flexible but requires Cypher expertise. Endpoint: POST /graph/cypher",
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
    const { label, properties = {} } = params;

    try {
      let query = `MATCH (n:${label})`;
      let queryParams = {};

      // Add property filters if provided
      if (Object.keys(properties).length > 0) {
        const conditions = Object.keys(properties).map((key, index) => {
          queryParams[`prop${index}`] = properties[key];
          return `n.${key} = $prop${index}`;
        });
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ' RETURN n';

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
    const { label, property, value } = params;

    try {
      let query;
      let queryParams = { value };

      if (label) {
        query = `MATCH (n:${label}) WHERE n.${property} CONTAINS $value RETURN n`;
      } else {
        query = `MATCH (n) WHERE n.${property} CONTAINS $value RETURN n, labels(n) as node_labels`;
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
    const { from_label, to_label, relationship_type } = params;

    try {
      let query = 'MATCH (a)-[r]->(b)';
      let conditions = [];
      let queryParams = {};

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

      query += ' RETURN a, type(r) as relationship_type, r, b, labels(a) as from_labels, labels(b) as to_labels';

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
    const { query } = params;

    try {
      // VictoriaLogs uses LogSQL syntax, not PromQL
      // Build the request parameters
      const requestParams = {
        query: query
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
    const { search_text, labels = {} } = params;

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
          query: query
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
    const { query = '*' } = params;

    try {
      const response = await axios.get(`${VICTORIA_LOGS_API_URL}/query`, {
        params: {
          query: query
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
    const { offset = 0 } = params;

    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/changelog`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        params: { offset },
        timeout: 30000
      });

      return {
        changelogs: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
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
    const { status } = params;

    try {
      console.log('🔍 Calling Manifest API:', `${MANIFEST_API_URL}/client/incident`);
      console.log('🔑 Using API Key:', config.MANIFEST_API_KEY ? 'Present' : 'Missing');

      const response = await axios.get(`${MANIFEST_API_URL}/client/incident`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        params: { status },
        timeout: 30000
      });

      return {
        incidents: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        filter_status: status,
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
    const { } = params;

    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/notification`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return {
        notifications: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API notifications failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getResources(params) {
    const { resource_type } = params;

    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/resource`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        params: { resource_type },
        timeout: 30000
      });

      return {
        resources: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        resource_type,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Manifest API resources failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getTickets(params) {
    const { status } = params;

    try {
      const response = await axios.get(`${MANIFEST_API_URL}/client/ticket`, {
        headers: {
          'X-API-Key': config.MANIFEST_API_KEY,
          'mit_org_key': config.MANIFEST_ORG_KEY || 'dev',
          'Content-Type': 'application/json'
        },
        params: { status },
        timeout: 30000
      });

      return {
        tickets: response.data,
        count: Array.isArray(response.data) ? response.data.length : 0,
        filter_status: status,
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

// AI execution endpoint - uses LLM with tool descriptions for intelligent selection
app.post('/api/ai-execute', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('🤖 AI Agent processing prompt:', prompt);

    if (!llmAvailable) {
      return res.status(503).json({
        error: 'LLM service not available',
        message: 'Please configure OpenAI API key or Llama endpoint'
      });
    }

    // Build tool catalog with descriptions for LLM
    const toolCatalog = Object.entries(MCP_TOOLS).map(([name, schema]) => {
      const params = schema.inputSchema?.properties || {};
      const required = schema.inputSchema?.required || [];

      return {
        name,
        description: schema.description,
        parameters: Object.entries(params).map(([paramName, paramSpec]) => ({
          name: paramName,
          type: paramSpec.type,
          description: paramSpec.description,
          required: required.includes(paramName)
        }))
      };
    });

    // Create system message with tool catalog
    const systemMessage = `You are an intelligent tool router and parameter extractor. Your job is to:
1. Analyze the user's query
2. Select the MOST APPROPRIATE tool from the available tools based on tool descriptions
3. Extract ALL required parameters from the query

CRITICAL RULES:
- Read tool descriptions CAREFULLY - they explain WHEN to use each tool
- Pay attention to parameter types (e.g., "resource_id" vs "changelog_id")
- If a tool says "NOT resource ID", don't use resource IDs with it
- Match the user's intent to the tool's use case described in its description

Available Tools:
${toolCatalog.map(t => `
${t.name}:
  Description: ${t.description}
  Parameters: ${t.parameters.map(p => `${p.name} (${p.type}${p.required ? ', required' : ''}): ${p.description}`).join('; ')}
`).join('\n')}

OUTPUT FORMAT (JSON only):
{
  "tool": "selected_tool_name",
  "parameters": {
    "param_name": "extracted_value"
  },
  "reasoning": "why this tool was selected based on its description"
}`;

    const messages = [
      { role: "system", content: systemMessage },
      { role: "user", content: `Query: "${prompt}"\n\nSelect the appropriate tool and extract parameters. Output JSON only.` }
    ];

    const aiResponse = await callLLM(messages, 0.1, 500);
    console.log('🧠 LLM Response:', aiResponse);

    // Parse LLM response
    let toolSelection;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }
      toolSelection = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('❌ Failed to parse LLM response:', parseError);
      return res.status(500).json({
        error: 'Failed to understand the query',
        details: aiResponse
      });
    }

    const { tool: selectedTool, parameters, reasoning } = toolSelection;
    console.log(`🎯 Selected tool: ${selectedTool}`);
    console.log(`📋 Parameters:`, parameters);
    console.log(`💭 Reasoning: ${reasoning}`);

    // Validate tool exists
    if (!MCP_TOOLS[selectedTool]) {
      return res.status(400).json({
        error: `Unknown tool: ${selectedTool}`,
        available_tools: Object.keys(MCP_TOOLS)
      });
    }

    // Execute the selected tool
    let result;
    try {
      console.log(`🔧 Executing tool: ${selectedTool} with params:`, parameters);
      result = await mcpRegistry.executeTool(selectedTool, parameters || {});
    } catch (execError) {
      console.error('❌ Tool execution failed:', execError);
      return res.status(500).json({
        error: `Tool execution failed: ${execError.message}`,
        tool: selectedTool,
        parameters
      });
    }

    // Format the result using LLM
    let formattedResult = null;
    try {
      // Determine formatting instructions based on tool type
      let formatInstructions = 'Provide a clear, concise summary of this data.';

      if (selectedTool.includes('log') && !selectedTool.includes('changelog')) {
        formatInstructions = `This is LOG DATA from VictoriaLogs. Write 1-2 sentences: "Found X log entries" and mention the most common pattern or level.`;
      } else if (selectedTool.includes('ticket')) {
        formatInstructions = `Analyze TICKET data. Start with summary (I found X tickets...), then describe each ticket with key details (ID, title, status, priority, description). End with insights about urgent items or trends. Write in natural paragraphs.`;
      } else if (selectedTool.includes('incident')) {
        formatInstructions = `Analyze INCIDENT data. Start with summary (I found X incidents...), highlight critical items, describe each with details (ID, title, severity, status, impact). End with analysis of patterns or concerns. Write in natural paragraphs.`;
      } else if (selectedTool.includes('changelog')) {
        formatInstructions = `Analyze CHANGELOG data. Start with summary (I found X changes...), then describe 5-10 most recent/important changes. For each change, explain what happened (resource/service name, what changed, when, severity, who made it). End with key observations about patterns, important changes, or recommendations. Write in natural flowing paragraphs like a professional report. Make timestamps readable (e.g., "Oct 26, 11:30 PM").`;
      } else if (selectedTool.includes('notification')) {
        formatInstructions = `Analyze NOTIFICATION data. Provide helpful insights with summary, important notifications, and actionable items. Write in natural paragraphs.`;
      } else if (selectedTool.includes('resource')) {
        formatInstructions = `Analyze RESOURCE data. Provide useful information about the resources with key insights and observations. Write in natural paragraphs.`;
      } else if (selectedTool.includes('schema') || selectedTool.includes('node') || selectedTool.includes('relationship')) {
        formatInstructions = `This is graph database schema. Write 1-2 sentences with key statistics.`;
      }

      const formatPrompt = `${formatInstructions}

JSON Data (first 15000 chars):
${JSON.stringify(result, null, 2).substring(0, 15000)}...

Total count in result: ${result.count || result.tickets?.length || result.changelogs?.length || result.incidents?.length || 'unknown'}`;

      const formatMessages = [
        {
          role: "system", content: `You are a helpful data analyst. Analyze the data and provide clear, conversational insights in plain English. 

CRITICAL FORMATTING RULES:
- NO markdown symbols (no #, ##, ###, *, **, ___, etc.)
- NO bullet points with • or -
- Write in natural paragraphs and sentences
- Use simple line breaks between sections
- Format like a professional email or report
- Be conversational but professional

Focus on what's useful and actionable. Help users understand what's happening in their systems.` },
        { role: "user", content: formatPrompt }
      ];

      formattedResult = await callLLM(formatMessages, 0.3, 2000);
      console.log('📝 Formatted result:', formattedResult);
    } catch (formatError) {
      console.warn('⚠️ Could not format result:', formatError.message);
      formattedResult = JSON.stringify(result, null, 2);
    }

    res.json({
      message: formattedResult,
      tool_used: selectedTool,
      reasoning: reasoning,
      raw_result: result
    });

  } catch (error) {
    console.error('❌ AI execution error:', error);
    res.status(500).json({
      error: `Failed to execute prompt: ${error.message}`
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
