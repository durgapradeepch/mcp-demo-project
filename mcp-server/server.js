const express = require('express');
const axios = require('axios');
const OpenAI = require('openai');
const config = require('./config');
const { assignHouse } = require('./house-assignment');



const app = express();
const PORT = config.SERVER_PORT;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

// MCP Tool Definitions
const MCP_TOOLS = {
  // Tool for getting characters
  get_characters: {
    name: "get_characters",
    description: "Retrieve all characters from the Game of Thrones database",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Maximum number of characters to return",
          default: 50
        },
        house: {
          type: "string",
          description: "Filter characters by house (optional)"
        }
      }
    }
  },

  // Tool for getting relationships
  get_relationships: {
    name: "get_relationships",
    description: "Retrieve all relationships between characters",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Maximum number of relationships to return",
          default: 50
        },
        character: {
          type: "string",
          description: "Filter relationships by specific character (optional)"
        }
      }
    }
  },

  // Tool for searching characters
  search_characters: {
    name: "search_characters",
    description: "Search for characters by name",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Character name to search for",
          required: true
        },
        limit: {
          type: "integer",
          description: "Maximum number of results to return",
          default: 20
        }
      },
      required: ["name"]
    }
  },

  // Tool for creating characters
  create_character: {
    name: "create_character",
    description: "Create a new character in the database",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Character name",
          required: true
        },
        house: {
          type: "string",
          description: "Character's house",
          default: "Unknown House"
        }
      },
      required: ["name"]
    }
  },

  // Tool for creating relationships
  create_relationship: {
    name: "create_relationship",
    description: "Create a relationship between two characters",
    inputSchema: {
      type: "object",
      properties: {
        fromCharacter: {
          type: "string",
          description: "Source character name",
          required: true
        },
        toCharacter: {
          type: "string",
          description: "Target character name",
          required: true
        },
        relationshipType: {
          type: "string",
          description: "Type of relationship",
          default: "INTERACTS"
        },
        weight: {
          type: "integer",
          description: "Relationship strength/weight",
          default: 1
        }
      },
      required: ["fromCharacter", "toCharacter"]
    }
  },

  // Tool for updating characters
  update_character: {
    name: "update_character",
    description: "Update character information",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Character name to update",
          required: true
        },
        house: {
          type: "string",
          description: "New house assignment",
          required: true
        }
      },
      required: ["name", "house"]
    }
  },

  // Tool for fixing house assignments
  fix_house_assignments: {
    name: "fix_house_assignments",
    description: "Fix house assignments for all characters using comprehensive logic",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  // Tool for deleting characters
  delete_character: {
    name: "delete_character",
    description: "Delete a character and all their relationships",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Character name to delete",
          required: true
        }
      },
      required: ["name"]
    }
  },

  // Tool for getting database statistics
  get_database_stats: {
    name: "get_database_stats",
    description: "Get database statistics including character count, relationship count, and house count",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  // VictoriaLogs Tools
  query_logs: {
    name: "query_logs",
    description: "Query logs from VictoriaLogs using LogsQL",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "LogsQL query to execute (e.g., 'level:error', '*', 'msg:timeout')",
          required: true
        },
        start: {
          type: "string",
          description: "Start time (RFC3339 timestamp or relative like '1h', '30m')",
          default: "1h"
        },
        end: {
          type: "string",
          description: "End time (RFC3339 timestamp or 'now')",
          default: "now"
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
    description: "Search logs by text content or field filters using LogsQL",
    inputSchema: {
      type: "object",
      properties: {
        search_text: {
          type: "string",
          description: "Text to search for in logs (searches in _msg field)"
        },
        level: {
          type: "string",
          description: "Log level filter (error, warn, info, debug)"
        },
        start: {
          type: "string",
          description: "Start time (RFC3339 timestamp or relative like '1h')",
          default: "1h"
        },
        end: {
          type: "string",
          description: "End time (RFC3339 timestamp or 'now')",
          default: "now"
        },
        limit: {
          type: "integer",
          description: "Maximum number of log entries to return",
          default: 100
        }
      }
    }
  },

  get_log_fields: {
    name: "get_log_fields",
    description: "Get available log fields and values from VictoriaLogs",
    inputSchema: {
      type: "object",
      properties: {
        field_type: {
          type: "string",
          description: "Type of fields to retrieve (field_names, field_values, or streams)",
          default: "field_names"
        },
        field_name: {
          type: "string",
          description: "Specific field name to get values for (when field_type=field_values)"
        }
      }
    }
  },

  get_log_stats: {
    name: "get_log_stats",
    description: "Get log statistics and aggregations from VictoriaLogs",
    inputSchema: {
      type: "object", 
      properties: {
        query: {
          type: "string",
          description: "LogsQL query to aggregate (e.g., 'level:error', '*')",
          default: "*"
        },
        time_range: {
          type: "string",
          description: "Time range for statistics",
          default: "1h"
        }
      }
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
    // Register all tools with their implementations
    this.tools.set('get_characters', this.getCharacters.bind(this));
    this.tools.set('get_relationships', this.getRelationships.bind(this));
    this.tools.set('search_characters', this.searchCharacters.bind(this));
    this.tools.set('create_character', this.createCharacter.bind(this));
    this.tools.set('create_relationship', this.createRelationship.bind(this));
    this.tools.set('update_character', this.updateCharacter.bind(this));
    this.tools.set('delete_character', this.deleteCharacter.bind(this));
    this.tools.set('fix_house_assignments', this.fixHouseAssignments.bind(this));
    this.tools.set('get_database_stats', this.getDatabaseStats.bind(this));
    
    // Register VictoriaLogs tools
    this.tools.set('query_logs', this.queryLogs.bind(this));
    this.tools.set('search_logs', this.searchLogs.bind(this));
    this.tools.set('get_log_fields', this.getLogFields.bind(this));
    this.tools.set('get_log_stats', this.getLogStats.bind(this));
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

  // Tool implementations
  async getCharacters(params = {}) {
    const { limit = 50, house } = params;
    let query = 'MATCH (c:Character)';
    let queryParams = { limit };

    if (house) {
      query += ' WHERE c.house = $house';
      queryParams.house = house;
    }

    query += ' RETURN c.name as name, c.house as house ORDER BY c.name LIMIT $limit';
    
    const result = await executeCypher(query, queryParams);
    return result.data.map(record => ({
      name: record.row[0],
      house: record.row[1]
    }));
  }

  async getRelationships(params = {}) {
    const { limit = 50, character } = params;
    let query = 'MATCH (c1:Character)-[r:INTERACTS]->(c2:Character)';
    let queryParams = { limit };

    if (character) {
      query += ' WHERE c1.name = $character OR c2.name = $character';
      queryParams.character = character;
    }

    query += ' RETURN c1.name as from, COALESCE(r.type, "INTERACTS") as relationship, c2.name as to, r.weight as weight LIMIT $limit';
    
    const result = await executeCypher(query, queryParams);
    return result.data.map(record => ({
      from: record.row[0],
      relationship: record.row[1],
      to: record.row[2],
      weight: record.row[3]
    }));
  }

  async searchCharacters(params) {
    const { name, limit = 20 } = params;
    const result = await executeCypher(
      'MATCH (c:Character) WHERE c.name CONTAINS $name RETURN c.name as name, c.house as house ORDER BY c.name LIMIT $limit',
      { name, limit }
    );
    
    return result.data.map(record => ({
      name: record.row[0],
      house: record.row[1]
    }));
  }

  async createCharacter(params) {
    const { name, house = 'Unknown House' } = params;
    const result = await executeCypher(
      'CREATE (c:Character {name: $name, house: $house}) RETURN c.name as name, c.house as house',
      { name, house }
    );
    
    return {
      name: result.data[0].row[0],
      house: result.data[0].row[1],
      action: 'created',
      timestamp: new Date().toISOString()
    };
  }

  async createRelationship(params) {
    const { fromCharacter, toCharacter, relationshipType = 'INTERACTS', weight = 1 } = params;
    
    // First check if both characters exist
    const fromChar = await executeCypher(
      'MATCH (c:Character {name: $name}) RETURN c.name as name',
      { name: fromCharacter }
    );
    
    if (fromChar.data.length === 0) {
      throw new Error(`Character '${fromCharacter}' not found`);
    }
    
    const toChar = await executeCypher(
      'MATCH (c:Character {name: $name}) RETURN c.name as name',
      { name: toCharacter }
    );
    
    if (toChar.data.length === 0) {
      throw new Error(`Character '${toCharacter}' not found`);
    }
    
    // Create the relationship - Neo4j doesn't support dynamic relationship types in Cypher
    // So we'll use a generic INTERACTS label but store the specific type as a property
    await executeCypher(`
      MATCH (c1:Character {name: $fromCharacter})
      MATCH (c2:Character {name: $toCharacter})
      CREATE (c1)-[r:INTERACTS {type: $relationshipType, weight: $weight}]->(c2)
    `, { fromCharacter, toCharacter, relationshipType, weight });
    
    // Return the relationship details directly since we know it was created
    return {
      from: fromCharacter,
      relationship: relationshipType,
      to: toCharacter,
      weight: weight,
      action: 'created',
      timestamp: new Date().toISOString()
    };
  }

  async updateCharacter(params) {
    const { name, house } = params;
    const result = await executeCypher(
      'MATCH (c:Character {name: $name}) SET c.house = $house RETURN c.name as name, c.house as house',
      { name, house }
    );
    
    if (result.data.length === 0) {
      throw new Error('Character not found');
    }
    
    return {
      name: result.data[0].row[0],
      house: result.data[0].row[1],
      action: 'updated',
      timestamp: new Date().toISOString()
    };
  }

  async deleteCharacter(params) {
    const { name } = params;
    const result = await executeCypher(
      'MATCH (c:Character {name: $name}) DETACH DELETE c RETURN count(c) as deleted',
      { name }
    );
    
    if (result.data[0].row[0] === 0) {
      throw new Error('Character not found');
    }
    
    return {
      deleted: true,
      name,
      action: 'deleted',
      timestamp: new Date().toISOString()
    };
  }

  async fixHouseAssignments() {
    const characters = await executeCypher('MATCH (c:Character) RETURN c.name as name');
    let updated = 0;
    
    for (const record of characters.data) {
      const characterName = record.row[0];
      const house = assignHouse(characterName);
      
      await executeCypher(
        'MATCH (c:Character {name: $name}) SET c.house = $house',
        { name: characterName, house }
      );
      updated++;
    }
    
    return {
      action: 'house_assignments_fixed',
      characters_updated: updated,
      timestamp: new Date().toISOString()
    };
  }

  async getDatabaseStats() {
    const charCount = await executeCypher('MATCH (c:Character) RETURN count(c) as count');
    const relCount = await executeCypher('MATCH ()-[r:INTERACTS]->() RETURN count(r) as count');
    const houseCount = await executeCypher('MATCH (c:Character) RETURN count(DISTINCT c.house) as count');
    
    return {
      characters: charCount.data[0].row[0],
      relationships: relCount.data[0].row[0],
      houses: houseCount.data[0].row[0],
      timestamp: new Date().toISOString()
    };
  }

  // VictoriaLogs tool implementations
  async queryLogs(params) {
    const { query, start = '1h', end = 'now', limit = 100 } = params;
    
    try {
      const queryParams = {
        query: query,
        limit: limit
      };
      
      // Add time range if specified
      if (start !== 'now') {
        if (start.match(/^\d+[smhd]$/)) {
          // Relative time like "1h", "30m"
          const now = new Date();
          const duration = this.parseRelativeTime(start);
          queryParams.start = new Date(now.getTime() - duration).toISOString();
        } else {
          queryParams.start = start;
        }
      }
      
      if (end !== 'now') {
        queryParams.end = end;
      }
      
      const response = await axios.get(`${VICTORIA_LOGS_API_URL}/query`, {
        params: queryParams,
        timeout: 30000
      });
      
      // VictoriaLogs returns raw JSON objects, one per line
      if (typeof response.data === 'string') {
        const logs = response.data.trim().split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              return JSON.parse(line);
            } catch (e) {
              return { _msg: line, _time: new Date().toISOString() };
            }
          });
        
        return {
          query: query,
          count: logs.length,
          logs: logs,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          query: query,
          data: response.data,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      throw new Error(`VictoriaLogs query failed: ${error.message}`);
    }
  }

  async searchLogs(params) {
    const { search_text, level, start = '1h', end = 'now', limit = 100 } = params;
    
    try {
      let query = '*';
      
      // Build LogsQL query based on search parameters
      if (search_text && level) {
        query = `_msg:${search_text} AND level:${level}`;
      } else if (search_text) {
        query = `_msg:${search_text}`;
      } else if (level) {
        query = `level:${level}`;
      }
      
      return await this.queryLogs({ query, start, end, limit });
    } catch (error) {
      throw new Error(`VictoriaLogs search failed: ${error.message}`);
    }
  }

  async getLogFields(params) {
    const { field_type = 'field_names', field_name } = params;
    
    try {
      let endpoint;
      let queryParams = {};
      
      switch (field_type.toLowerCase()) {
        case 'field_names':
          endpoint = '/field_names';
          queryParams.query = '*';
          break;
        case 'field_values':
          if (!field_name) {
            throw new Error('field_name is required when field_type is field_values');
          }
          endpoint = '/field_values';
          queryParams.query = '*';
          queryParams.field = field_name;
          break;
        case 'streams':
          endpoint = '/streams';
          queryParams.query = '*';
          break;
        default:
          endpoint = '/field_names';
          queryParams.query = '*';
      }
      
      const response = await axios.get(`${VICTORIA_LOGS_API_URL}${endpoint}`, {
        params: queryParams,
        timeout: 30000
      });
      
      return {
        field_type: field_type,
        field_name: field_name,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`VictoriaLogs fields query failed: ${error.message}`);
    }
  }

  async getLogStats(params) {
    const { query = '*', time_range = '1h' } = params;
    
    try {
      // Get recent logs and provide basic statistics
      const result = await this.queryLogs({ query, start: time_range, limit: 1000 });
      
      const stats = {
        query: query,
        time_range: time_range,
        total_logs: result.count || 0,
        timestamp: new Date().toISOString()
      };
      
      // Add level statistics if logs contain level information
      if (result.logs && Array.isArray(result.logs)) {
        const levelCounts = {};
        result.logs.forEach(log => {
          const level = log.level || log['labels.level'] || 'unknown';
          levelCounts[level] = (levelCounts[level] || 0) + 1;
        });
        stats.level_distribution = levelCounts;
      }
      
      return stats;
    } catch (error) {
      throw new Error(`VictoriaLogs stats query failed: ${error.message}`);
    }
  }

  // Helper method to parse relative time
  parseRelativeTime(timeInput) {
    const match = timeInput.match(/^(\d+)([smhd])$/);
    if (!match) return 3600000; // Default to 1 hour
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 3600000; // Default to 1 hour
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
const NEO4J_URL = config.NEO4J_URL;
const NEO4J_USER = config.NEO4J_USER;
const NEO4J_PASS = config.NEO4J_PASS;

// VictoriaLogs configuration
const VICTORIA_LOGS_URL = config.VICTORIA_LOGS_URL;
const VICTORIA_LOGS_API_URL = config.VICTORIA_LOGS_API_URL;

// Function to execute Cypher queries via HTTP API
async function executeCypher(query, params = {}) {
  try {
    const response = await axios.post(`${NEO4J_URL}/db/neo4j/tx/commit`, {
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

// Function to import Game of Thrones data
async function importGameOfThronesData() {
  try {
    console.log('Starting data import...');
    
    // Clear existing data
    await executeCypher('MATCH (n) DETACH DELETE n');
    console.log('Cleared existing data');
    
    // Import nodes (characters)
    const nodeResult = await executeCypher(`
      LOAD CSV WITH HEADERS FROM 'file:///got-s1-nodes.csv' AS row
      CREATE (c:Character {id: row.Id, name: row.Label})
    `);
    console.log(`Imported characters`);
    
    // Import edges (relationships)
    const edgeResult = await executeCypher(`
      LOAD CSV WITH HEADERS FROM 'file:///got-s1-edges.csv' AS row
      MATCH (source:Character {id: row.Source})
      MATCH (target:Character {id: row.Target})
      CREATE (source)-[r:INTERACTS {weight: toInteger(row.Weight), season: toInteger(row.Season)}]->(target)
    `);
    console.log(`Imported relationships`);
    
    // Add house information using comprehensive assignment
    const characters = await executeCypher('MATCH (c:Character) RETURN c.name as name');
    
    for (const record of characters.data) {
      const characterName = record.row[0];
      const house = assignHouse(characterName);
      
      await executeCypher(
        'MATCH (c:Character {name: $name}) SET c.house = $house',
        { name: characterName, house }
      );
    }
    
    console.log('Data import completed successfully!');
  } catch (error) {
    console.error('Error importing data:', error);
  }
}

// Express endpoints for frontend
app.get('/api/characters', async (req, res) => {
  try {
    const result = await executeCypher('MATCH (c:Character) RETURN c.name as name, c.house as house LIMIT 50');
    
    const characters = result.data.map(record => ({
      name: record.row[0],
      house: record.row[1]
    }));
    
    res.json(characters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/relationships', async (req, res) => {
  try {
    const result = await executeCypher(`
      MATCH (c1:Character)-[r:INTERACTS]->(c2:Character) 
      RETURN c1.name as from, type(r) as relationship, c2.name as to, r.weight as weight
      ORDER BY r.weight DESC
      LIMIT 50
    `);
    
    const relationships = result.data.map(record => ({
      from: record.row[0],
      relationship: record.row[1],
      to: record.row[2],
      weight: record.row[3]
    }));
    
    res.json(relationships);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const result = await executeCypher(
      'MATCH (c:Character) WHERE c.name CONTAINS $name RETURN c.name as name, c.house as house LIMIT 20',
      { name }
    );
    
    const characters = result.data.map(record => ({
      name: record.row[0],
      house: record.row[1]
    }));
    
    res.json(characters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const charCount = await executeCypher('MATCH (c:Character) RETURN count(c) as count');
    const relCount = await executeCypher('MATCH ()-[r:INTERACTS]->() RETURN count(r) as count');
    const houseCount = await executeCypher('MATCH (c:Character) RETURN count(DISTINCT c.house) as count');
    
    res.json({
      characters: charCount.data[0].row[0],
      relationships: relCount.data[0].row[0],
      houses: houseCount.data[0].row[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Data import endpoint
app.post('/api/import', async (req, res) => {
  try {
    await importGameOfThronesData();
    res.json({ message: 'Data import completed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Insert new character endpoint
app.post('/api/characters', async (req, res) => {
  try {
    const { name, house } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Character name is required' });
    }
    
    const result = await executeCypher(
      'CREATE (c:Character {name: $name, house: $house}) RETURN c.name as name, c.house as house',
      { name, house: house || 'Unknown House' }
    );
    
    const newCharacter = {
      name: result.data[0].row[0],
      house: result.data[0].row[1]
    };
    
    res.status(201).json({ 
      message: 'Character created successfully', 
      character: newCharacter 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Insert new relationship endpoint
app.post('/api/relationships', async (req, res) => {
  try {
    const { fromCharacter, toCharacter, relationshipType, weight } = req.body;
    
    if (!fromCharacter || !toCharacter || !relationshipType) {
      return res.status(400).json({ 
        error: 'fromCharacter, toCharacter, and relationshipType are required' 
      });
    }
    
    const result = await executeCypher(`
      MATCH (c1:Character {name: $fromCharacter})
      MATCH (c2:Character {name: $toCharacter})
      CREATE (c1)-[r:INTERACTS {type: $relationshipType, weight: $weight}]->(c2)
      RETURN c1.name as from, type(r) as relationship, c2.name as to, r.weight as weight
    `, { 
      fromCharacter, 
      toCharacter, 
      relationshipType, 
      weight: weight || 1 
    });
    
    const newRelationship = {
      from: result.data[0].row[0],
      relationship: result.data[0].row[1],
      to: result.data[0].row[2],
      weight: result.data[0].row[3]
    };
    
    res.status(201).json({ 
      message: 'Relationship created successfully', 
      relationship: newRelationship 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update character endpoint
app.put('/api/characters/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { house } = req.body;
    
    if (!house) {
      return res.status(400).json({ error: 'House information is required' });
    }
    
    const result = await executeCypher(
      'MATCH (c:Character {name: $name}) SET c.house = $house RETURN c.name as name, c.house as house',
      { name, house }
    );
    
    if (result.data.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    const updatedCharacter = {
      name: result.data[0].row[0],
      house: result.data[0].row[1]
    };
    
    res.json({ 
      message: 'Character updated successfully', 
      character: updatedCharacter 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete character endpoint
app.delete('/api/characters/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    const result = await executeCypher(
      'MATCH (c:Character {name: $name}) DETACH DELETE c RETURN count(c) as deleted',
      { name }
    );
    
    if (result.data[0].row[0] === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    res.json({ message: 'Character deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MCP Tool Discovery Endpoint
app.get('/api/mcp/tools', (req, res) => {
  try {
    res.json({
      tools: mcpRegistry.getAvailableTools(),
      mcp_version: "1.0.0",
      server_info: "Neo4j Game of Thrones MCP Server"
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

// MCP endpoints for AI communication (legacy support)
app.get('/api/mcp/characters', async (req, res) => {
  try {
    const result = await mcpRegistry.getCharacters({ limit: 20 });
    
    res.json({
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mcp/relationships', async (req, res) => {
  try {
    const result = await executeCypher(`
      MATCH (c1:Character)-[r:INTERACTS]->(c2:Character) 
      RETURN c1.name as from, type(r) as relationship, c2.name as to, r.weight as weight
      ORDER BY r.weight DESC
      LIMIT 20
    `);
    
    const relationships = result.data.map(record => ({
      from: record.row[0],
      relationship: record.row[1],
      to: record.row[2],
      weight: record.row[3]
    }));
    
    res.json({
      content: [
        {
          type: 'text',
          text: JSON.stringify(relationships, null, 2)
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/mcp/search', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'Name parameter is required' });
    }
    
    const result = await executeCypher(
      'MATCH (c:Character) WHERE c.name CONTAINS $name RETURN c.name as name, c.house as house LIMIT 10',
      { name }
    );
    
    const characters = result.data.map(record => ({
      name: record.row[0],
      house: record.row[1]
    }));
    
    res.json({
      content: [
        {
          type: 'text',
          text: JSON.stringify(characters, null, 2)
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MCP endpoints for inserting data
app.post('/api/mcp/characters', async (req, res) => {
  try {
    const { name, house } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Character name is required' });
    }
    
    const result = await executeCypher(
      'CREATE (c:Character {name: $name, house: $house}) RETURN c.name as name, c.house as house',
      { name, house: house || 'Unknown House' }
    );
    
    const newCharacter = {
      name: result.data[0].row[0],
      house: result.data[0].row[1]
    };
    
    res.json({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ message: 'Character created successfully', character: newCharacter }, null, 2)
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/mcp/relationships', async (req, res) => {
  try {
    const { fromCharacter, toCharacter, relationshipType, weight } = req.body;
    
    if (!fromCharacter || !toCharacter || !relationshipType) {
      return res.status(400).json({ 
        error: 'fromCharacter, toCharacter, and relationshipType are required' 
      });
    }
    
    const result = await executeCypher(`
      MATCH (c1:Character {name: $fromCharacter})
      MATCH (c2:Character {name: $toCharacter})
      CREATE (c1)-[r:INTERACTS {type: $relationshipType, weight: $weight}]->(c2)
      RETURN c1.name as from, type(r) as relationship, c2.name as to, r.weight as weight
    `, { 
      fromCharacter, 
      toCharacter, 
      relationshipType, 
      weight: weight || 1 
    });
    
    const newRelationship = {
      from: result.data[0].row[0],
      relationship: result.data[0].row[1],
      to: result.data[0].row[2],
      weight: result.data[0].row[3]
    };
    
    res.json({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ message: 'Relationship created successfully', relationship: newRelationship }, null, 2)
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    // Try to use OpenAI first
    try {
      // Create a system message that explains the available MCP tools
      const systemMessage = `You are an AI agent that helps users interact with both a Neo4j database containing Game of Thrones characters and relationships, and VictoriaLogs for log querying.

Available MCP Tools you can use:

Neo4j Tools:
1. get_characters - Retrieve all characters (with optional house filter and limit)
2. get_relationships - Get all relationships (with optional character filter and limit)
3. search_characters - Search characters by name
4. create_character - Create new character with name and house
5. create_relationship - Create relationship between two characters
6. update_character - Update character's house
7. delete_character - Delete character and all relationships
8. get_database_stats - Get database statistics

VictoriaLogs Tools:
9. query_logs - Execute LogsQL queries against log data
10. search_logs - Search logs by text content or level filters
11. get_log_fields - Get available log fields and values
12. get_log_stats - Get log statistics and aggregations

Database schema:
- Characters have: name, house
- Relationships are INTERACTS with: type, weight

Log querying:
- Uses LogsQL syntax (e.g., 'level:error', '_msg:timeout', '*')
- Supports time range filtering and field-based searches
- Can search by text content in _msg field or specific fields like level

Your job is to:
1. Understand what the user wants (Neo4j data or logs)
2. Decide which MCP tools to call
3. Provide a clear action plan
4. Return the result in this format:
   {
     "action": "what you're doing",
     "tools": ["list of tool names to call"],
     "reasoning": "why you chose these tools",
     "execution_plan": "step by step plan"
   }

Be intelligent and helpful. For character/relationship queries, use Neo4j tools. For log queries, use VictoriaLogs tools.`;

      // Get AI analysis of the prompt
      const aiResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      aiAnalysis = aiResponse.choices[0].message.content;
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
            action: "analyze_request",
            endpoints: ["/api/mcp/characters"],
            reasoning: "AI provided analysis but no clear action plan",
            execution_plan: "Will attempt to understand and execute the request"
          };
        }
      } catch (parseError) {
        console.log('⚠️ Could not parse AI response as JSON, using fallback');
        actionPlan = {
          action: "analyze_request",
          endpoints: ["/api/mcp/characters"],
          reasoning: "AI provided analysis but response format was unclear",
          execution_plan: "Will attempt to understand and execute the request"
        };
      }
    } catch (aiError) {
      console.log('⚠️ OpenAI API unavailable, using fallback system:', aiError.message);
      
      // Fallback: intelligent pattern matching without AI
      aiAnalysis = "AI service temporarily unavailable. Using intelligent fallback system.";
      
      const lowerPrompt = prompt.toLowerCase();
      
      // Check for log-related queries first
      if (lowerPrompt.includes('log') || lowerPrompt.includes('metric') || lowerPrompt.includes('error') || 
          lowerPrompt.includes('http') || lowerPrompt.includes('request') || lowerPrompt.includes('victoria') ||
          lowerPrompt.includes('promql') || lowerPrompt.includes('monitor')) {
        if (lowerPrompt.includes('error') || lowerPrompt.includes('exception') || lowerPrompt.includes('fail')) {
          actionPlan = {
            action: "search_error_logs",
            tools: ["search_logs"],
            reasoning: "User wants to find error logs",
            execution_plan: "Search logs for error-related content"
          };
        } else if (lowerPrompt.includes('metric') || lowerPrompt.includes('stat') || lowerPrompt.includes('available')) {
          actionPlan = {
            action: "get_log_metrics",
            tools: ["get_log_metrics"],
            reasoning: "User wants to see available metrics",
            execution_plan: "Retrieve available log metrics and labels"
          };
        } else if (lowerPrompt.includes('http') || lowerPrompt.includes('request')) {
          actionPlan = {
            action: "query_http_logs",
            tools: ["query_logs"],
            reasoning: "User wants to query HTTP request logs",
            execution_plan: "Execute PromQL query for HTTP-related metrics"
          };
        } else {
          actionPlan = {
            action: "search_logs",
            tools: ["search_logs"],
            reasoning: "User wants to search logs",
            execution_plan: "Search logs based on user criteria"
          };
        }
      } else if (lowerPrompt.includes('add') || lowerPrompt.includes('create') || lowerPrompt.includes('new')) {
        if (lowerPrompt.includes('character')) {
          actionPlan = {
            action: "create_character",
            endpoints: ["POST /api/mcp/characters"],
            reasoning: "User wants to create a new character",
            execution_plan: "Extract character name and house, then create in database"
          };
        } else if (lowerPrompt.includes('relationship')) {
          actionPlan = {
            action: "create_relationship",
            endpoints: ["POST /api/mcp/relationships"],
            reasoning: "User wants to create a new relationship",
            execution_plan: "Extract character names and relationship details, then create connection"
          };
        }
      } else if (lowerPrompt.includes('show') || lowerPrompt.includes('find') || lowerPrompt.includes('get')) {
        if (lowerPrompt.includes('character')) {
          actionPlan = {
            action: "search_characters",
            endpoints: ["GET /api/mcp/characters"],
            reasoning: "User wants to see character information",
            execution_plan: "Query database for character data"
          };
        } else if (lowerPrompt.includes('relationship')) {
          actionPlan = {
            action: "search_relationships",
            endpoints: ["GET /api/mcp/relationships"],
            reasoning: "User wants to see relationship information",
            execution_plan: "Query database for relationship data"
          };
        }
      } else if (lowerPrompt.includes('update') || lowerPrompt.includes('change') || lowerPrompt.includes('modify')) {
        actionPlan = {
          action: "update_character",
          endpoints: ["PUT /api/characters"],
          reasoning: "User wants to modify existing character data",
          execution_plan: "Extract character name and new house, then update database"
        };
      } else if (lowerPrompt.includes('delete') || lowerPrompt.includes('remove')) {
        actionPlan = {
          action: "delete_character",
          endpoints: ["DELETE /api/characters"],
          reasoning: "User wants to remove character data",
          execution_plan: "Extract character name, then delete from database"
        };
      } else {
        actionPlan = {
          action: "analyze_request",
          endpoints: ["GET /api/mcp/characters"],
          reasoning: "Request unclear, showing general character data",
          execution_plan: "Display available characters to help user understand the system"
        };
      }
    }

    // Execute the action plan based on the AI's analysis or fallback
    let result;
    let message;
    let feedback = 'Operation completed successfully';

    // Check if we have a valid action plan from AI
    if (actionPlan && actionPlan.action) {
      const action = actionPlan.action.toLowerCase();
      
      // Handle VictoriaMetrics log queries first
      if (action.includes('log') || action.includes('metric') || action.includes('search_logs') || 
          action.includes('query_logs') || action.includes('get_log') || action.includes('victoria')) {
        
        try {
          if (action.includes('error') || action.includes('search_error_logs')) {
            // Search for error logs
            const result = await mcpRegistry.executeTool('search_logs', {
              search_text: 'error',
              start: '30m',
              limit: 50
            });
            message = `Found error logs from the last 30 minutes`;
            feedback = `Successfully searched for error logs`;
            return res.json({
              message: message,
              details: result,
              ai_analysis: aiAnalysis,
              action_plan: actionPlan,
              feedback: feedback,
              fallback_mode: !aiAnalysis || aiAnalysis.includes('fallback')
            });
          } else if (action.includes('metric') || action.includes('get_log_metrics') || action.includes('field')) {
            // Get available fields
            const result = await mcpRegistry.executeTool('get_log_fields', {
              field_type: 'field_names'
            });
            message = `Retrieved available log fields`;
            feedback = `Successfully retrieved log fields`;
            return res.json({
              message: message,
              details: result,
              ai_analysis: aiAnalysis,
              action_plan: actionPlan,
              feedback: feedback,
              fallback_mode: !aiAnalysis || aiAnalysis.includes('fallback')
            });
          } else if (action.includes('http') || action.includes('request') || action.includes('query_http_logs')) {
            // Query logs with a general query
            const result = await mcpRegistry.executeTool('query_logs', {
              query: '*',
              start: '1h',
              limit: 50
            });
            message = `Retrieved logs from the last hour`;
            feedback = `Successfully queried logs`;
            return res.json({
              message: message,
              details: result,
              ai_analysis: aiAnalysis,
              action_plan: actionPlan,
              feedback: feedback,
              fallback_mode: !aiAnalysis || aiAnalysis.includes('fallback')
            });
          } else {
            // General log search
            const timeMatch = prompt.match(/(\d+)\s*(minute|hour|day)s?/i);
            const timeRange = timeMatch ? `${timeMatch[1]}${timeMatch[2][0]}` : '1h';
            
            const result = await mcpRegistry.executeTool('search_logs', {
              start: timeRange,
              limit: 50
            });
            message = `Retrieved logs from the last ${timeRange}`;
            feedback = `Successfully searched logs`;
            return res.json({
              message: message,
              details: result,
              ai_analysis: aiAnalysis,
              action_plan: actionPlan,
              feedback: feedback,
              fallback_mode: !aiAnalysis || aiAnalysis.includes('fallback')
            });
          }
        } catch (error) {
          message = `VictoriaMetrics query failed: ${error.message}`;
          feedback = `Log query error: ${error.message}`;
          return res.json({
            message: message,
            details: { error: error.message },
            ai_analysis: aiAnalysis,
            action_plan: actionPlan,
            feedback: feedback,
            fallback_mode: true
          });
        }
      } else if (action.includes('create') || action.includes('add') || action.includes('new')) {
        // Handle creation requests
        if (action.includes('character')) {
          // Extract character info from prompt using AI insights
          const charMatch = prompt.match(/['"]([^'"]+)['"]/);
          const houseMatch = prompt.match(/house\s+['"]([^'"]+)['"]|to\s+house\s+['"]([^'"]+)['"]|house\s+([a-zA-Z\s]+)(?=\s|$)|stark|lannister|targaryen|baratheon|greyjoy|tyrell|martell/gi);
          
          if (charMatch) {
            const name = charMatch[1];
            let house = 'Unknown House';
            
            if (houseMatch) {
              // Extract house from the match
              let houseName = houseMatch[0];
              if (houseName.toLowerCase().includes('house')) {
                house = houseName.trim();
              } else {
                // Convert house name to proper format
                houseName = houseName.trim();
                if (houseName.toLowerCase() === 'stark') house = 'House Stark';
                else if (houseName.toLowerCase() === 'lannister') house = 'House Lannister';
                else if (houseName.toLowerCase() === 'targaryen') house = 'House Targaryen';
                else if (houseName.toLowerCase() === 'baratheon') house = 'House Baratheon';
                else if (houseName.toLowerCase() === 'greyjoy') house = 'House Greyjoy';
                else if (houseName.toLowerCase() === 'tyrell') house = 'House Tyrell';
                else if (houseName.toLowerCase() === 'martell') house = 'House Martell';
                else house = `House ${houseName}`;
              }
            }
            
            try {
              const createResult = await executeCypher(
                'CREATE (c:Character {name: $name, house: $house}) RETURN c.name as name, c.house as house',
                { name, house }
              );
              
              if (createResult.data && createResult.data.length > 0) {
                message = `Character "${name}" created successfully in ${house}!`;
                result = { 
                  name: createResult.data[0].row[0], 
                  house: createResult.data[0].row[1],
                  action: 'created',
                  timestamp: new Date().toISOString()
                };
                feedback = `Successfully created character "${name}" in ${house}`;
              } else {
                throw new Error('Character creation failed - no data returned');
              }
            } catch (dbError) {
              message = `Failed to create character: ${dbError.message}`;
              feedback = `Database error: ${dbError.message}`;
              result = { error: dbError.message };
            }
          } else {
            message = 'Could not extract character name from prompt';
            feedback = 'Please use quotes around character names like "Character Name"';
            result = { error: 'Name extraction failed' };
          }
        } else if (action.includes('relationship')) {
          // Extract relationship info
          const betweenMatch = prompt.match(/between\s+['"]([^'"]+)['"]\s+and\s+['"]([^'"]+)['"]/);
          const andMatch = prompt.match(/['"]([^'"]+)['"]\s+and\s+['"]([^'"]+)['"]/);
          
          if (betweenMatch || andMatch) {
            const match = betweenMatch || andMatch;
            const fromChar = match[1];
            const toChar = match[2];
            
            // Determine relationship type from context
            let relType = 'INTERACTS';
            if (prompt.toLowerCase().includes('friend')) relType = 'FRIENDS';
            else if (prompt.toLowerCase().includes('alliance')) relType = 'ALLIES';
            else if (prompt.toLowerCase().includes('enemy')) relType = 'ENEMIES';
            
            const weight = prompt.match(/weight\s+(\d+)/) ? parseInt(prompt.match(/weight\s+(\d+)/)[1]) : 5;
            
            try {
              const relResult = await executeCypher(`
                MATCH (c1:Character {name: $fromCharacter})
                MATCH (c2:Character {name: $toCharacter})
                CREATE (c1)-[r:INTERACTS {type: $relationshipType, weight: $weight}]->(c2)
                RETURN c1.name as from, type(r) as relationship, c2.name as to, r.weight as weight
              `, { fromCharacter: fromChar, toCharacter: toChar, relationshipType: relType, weight });
              
              if (relResult.data && relResult.data.length > 0) {
                message = `Relationship created successfully between "${fromChar}" and "${toChar}"!`;
                result = {
                  from: relResult.data[0].row[0],
                  relationship: relResult.data[0].row[1],
                  to: relResult.data[0].row[2],
                  weight: relResult.data[0].row[3],
                  action: 'created',
                  timestamp: new Date().toISOString()
                };
                feedback = `Successfully created ${relType} relationship between "${fromChar}" and "${toChar}"`;
              } else {
                throw new Error('Relationship creation failed - no data returned');
              }
            } catch (dbError) {
              message = `Failed to create relationship: ${dbError.message}`;
              feedback = `Database error: ${dbError.message}`;
              result = { error: dbError.message };
            }
          } else {
            message = 'Could not extract character names for relationship';
            feedback = 'Please use quotes around character names like "Character1" and "Character2"';
            result = { error: 'Name extraction failed' };
          }
        }
      } else if (action.includes('search') || action.includes('find') || action.includes('show') || action.includes('get') || action.includes('retrieve')) {
        // Handle search/query requests
        if (prompt.toLowerCase().includes('character') || prompt.toLowerCase().includes('characters')) {
          try {
            // Check if it's a specific search
            const nameMatch = prompt.match(/['"]([^'"]+)['"]/);
            if (nameMatch) {
              const searchName = nameMatch[1];
              const searchResult = await executeCypher(
                'MATCH (c:Character {name: $name}) RETURN c.name as name, c.house as house',
                { name: searchName }
              );
              
              if (searchResult.data && searchResult.data.length > 0) {
                const character = {
                  name: searchResult.data[0].row[0],
                  house: searchResult.data[0].row[1]
                };
                message = `Found character "${searchName}"`;
                result = { character, found: true };
                feedback = `Successfully found character "${searchName}" in ${character.house}`;
              } else {
                message = `Character "${searchName}" not found in database`;
                result = { found: false, searched_for: searchName };
                feedback = `No character named "${searchName}" found in database`;
              }
            } else {
              // Show all characters
              const searchResult = await executeCypher('MATCH (c:Character) RETURN c.name as name, c.house as house ORDER BY c.name');
              const characters = searchResult.data.map(record => ({
                name: record.row[0],
                house: record.row[1]
              }));
              
              message = `Found ${characters.length} characters in the database`;
              result = { characters, count: characters.length, total: characters.length };
              feedback = `Successfully retrieved ${characters.length} characters from database`;
            }
          } catch (dbError) {
            message = `Failed to search characters: ${dbError.message}`;
            feedback = `Database error: ${dbError.message}`;
            result = { error: dbError.message };
          }
        } else if (prompt.toLowerCase().includes('relationship') || prompt.toLowerCase().includes('relationships')) {
          try {
            const searchResult = await executeCypher(`
              MATCH (c1:Character)-[r:INTERACTS]->(c2:Character) 
              RETURN c1.name as from, type(r) as relationship, c2.name as to, r.weight as weight
              ORDER BY r.weight DESC
              LIMIT 50
            `);
            
            const relationships = searchResult.data.map(record => ({
              from: record.row[0],
              relationship: record.row[1],
              to: record.row[2],
              weight: record.row[3]
            }));
            
            message = `Found ${relationships.length} relationships in the database`;
            result = { relationships, count: relationships.length, total: relationships.length };
            feedback = `Successfully retrieved ${relationships.length} relationships from database`;
          } catch (dbError) {
            message = `Failed to search relationships: ${dbError.message}`;
            feedback = `Database error: ${dbError.message}`;
            result = { error: dbError.message };
          }
        }
      } else if (action.includes('update') || action.includes('change') || action.includes('modify')) {
        // Handle update requests
        const nameMatch = prompt.match(/['"]([^'"]+)['"]/);
        const houseMatch = prompt.match(/house\s+['"]([^'"]+)['"]|to\s+house\s+['"]([^'"]+)['"]|house\s+([a-zA-Z\s]+)(?=\s|$)/i);
        
        if (nameMatch && houseMatch) {
          const name = nameMatch[1];
          let house = houseMatch[1] || houseMatch[2] || 'Unknown House';
          house = house.trim();
          if (!house.toLowerCase().startsWith('house ')) {
            house = `House ${house}`;
          }
          
          try {
            const updateResult = await executeCypher(
              'MATCH (c:Character {name: $name}) SET c.house = $house RETURN c.name as name, c.house as house',
              { name, house }
            );
            
            if (updateResult.data && updateResult.data.length > 0) {
              message = `Character "${name}" updated successfully!`;
              result = { 
                name: updateResult.data[0].row[0], 
                house: updateResult.data[0].row[1],
                action: 'updated',
                timestamp: new Date().toISOString()
              };
              feedback = `Successfully updated character "${name}" to ${house}`;
            } else {
              message = `Character "${name}" not found for update`;
              feedback = `No character named "${name}" found to update`;
              result = { error: 'Character not found' };
            }
          } catch (dbError) {
            message = `Failed to update character: ${dbError.message}`;
            feedback = `Database error: ${dbError.message}`;
            result = { error: dbError.message };
          }
        } else {
          message = 'Could not extract character name or house for update';
          feedback = 'Please use quotes around names and specify the house';
          result = { error: 'Parameter extraction failed' };
        }
      } else if (action.includes('delete') || action.includes('remove')) {
        // Handle deletion requests
        const nameMatch = prompt.match(/['"]([^'"]+)['"]/);
        
        if (nameMatch) {
          const name = nameMatch[1];
          
          try {
            const deleteResult = await executeCypher(
              'MATCH (c:Character {name: $name}) DETACH DELETE c RETURN count(c) as deleted',
              { name }
            );
            
            if (deleteResult.data && deleteResult.data[0].row[0] > 0) {
              message = `Character "${name}" deleted successfully!`;
              result = { deleted: true, name, action: 'deleted', timestamp: new Date().toISOString() };
              feedback = `Successfully deleted character "${name}" from database`;
            } else {
              message = `Character "${name}" not found for deletion`;
              feedback = `No character named "${name}" found to delete`;
              result = { error: 'Character not found' };
            }
          } catch (dbError) {
            message = `Failed to delete character: ${dbError.message}`;
            feedback = `Database error: ${dbError.message}`;
            result = { error: dbError.message };
          }
        } else {
          message = 'Could not extract character name for deletion';
          feedback = 'Please use quotes around character names';
          result = { error: 'Name extraction failed' };
        }
      } else {
        // Fallback for complex queries
        message = "I understand your request. Let me gather some information to help you.";
        try {
          const charResult = await executeCypher('MATCH (c:Character) RETURN c.name as name, c.house as house ORDER BY c.name LIMIT 20');
          const characters = charResult.data.map(record => ({
            name: record.row[0],
            house: record.row[1]
          }));
          result = { characters, count: characters.length, message: "Here are some characters to get you started" };
          feedback = `Retrieved ${characters.length} sample characters from database`;
        } catch (dbError) {
          message = `Failed to retrieve sample data: ${dbError.message}`;
          feedback = `Database error: ${dbError.message}`;
          result = { error: dbError.message };
        }
      }
    } else {
      // Fallback for complex queries
      message = "I understand your request. Let me gather some information to help you.";
      try {
        const charResult = await executeCypher('MATCH (c:Character) RETURN c.name as name, c.house as house ORDER BY c.name LIMIT 20');
        const characters = charResult.data.map(record => ({
          name: record.row[0],
          house: record.row[1]
        }));
        result = { characters, count: characters.length, message: "Here are some characters to get you started" };
        feedback = `Retrieved ${characters.length} sample characters from database`;
      } catch (dbError) {
        message = `Failed to retrieve sample data: ${dbError.message}`;
        feedback = `Database error: ${dbError.message}`;
        result = { error: dbError.message };
      }
    }

    res.json({
      message: message,
      details: result,
      ai_analysis: aiAnalysis,
      action_plan: actionPlan,
      feedback: feedback,
      fallback_mode: !aiAnalysis || aiAnalysis.includes('fallback')
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
  console.log(`🚀 Neo4j MCP Server running on port ${PORT}`);
  console.log(`🌐 Access Neo4j browser at: http://localhost:7474`);
  console.log(`📊 Access VictoriaLogs at: ${VICTORIA_LOGS_URL}`);
  console.log(`🎨 Frontend should connect to: http://localhost:3001`);
  console.log(`🔧 Note: Neo4j is running on single port 7474 (HTTP only)`);
  console.log(`🤖 MCP Tools available at /api/mcp/tools`);
  console.log(`⚡ MCP Tool execution at /api/mcp/execute`);
  console.log(`🧠 AI execution endpoint at /api/ai-execute`);

  console.log(`📚 Available Neo4j Tools: get_characters, get_relationships, search_characters, create_character, create_relationship, update_character, fix_house_assignments, delete_character, get_database_stats`);
  console.log(`📊 Available VictoriaLogs Tools: query_logs, search_logs, get_log_fields, get_log_stats`);
  
  // Import data on startup
  setTimeout(() => {
    importGameOfThronesData();
  }, 5000); // Wait 5 seconds for Neo4j to be ready
});
