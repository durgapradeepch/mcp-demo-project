# Neo4j MCP Project

A Model Context Protocol (MCP) server that provides AI agents with tools to interact with a Neo4j database containing Game of Thrones character and relationship data.

## 🚀 Project Structure

```
neo4j-mcp-project/
├── mcp-server/          # MCP Server with Neo4j integration
├── frontend/            # React frontend application
├── graph_data/          # Neo4j database and Game of Thrones data
└── README.md            # This file
```

## 🛠️ MCP Tools Available

The server provides the following MCP tools for AI agents:

### Data Retrieval Tools

- **`get_characters`** - Retrieve characters with optional house filtering
- **`get_relationships`** - Get relationships between characters
- **`search_characters`** - Search characters by name
- **`get_database_stats`** - Get database statistics

### Data Modification Tools

- **`create_character`** - Add new characters to the database
- **`create_relationship`** - Create relationships between characters
- **`update_character`** - Modify character information
- **`delete_character`** - Remove characters and their relationships

## 🔧 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Neo4j database running on port 7474

### Installation

1. **Start the MCP Server:**

   ```bash
   cd mcp-server
   npm install
   npm start
   ```

2. **Start the Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### MCP Endpoints

- **Tool Discovery:** `GET /api/mcp/tools`
- **Tool Execution:** `POST /api/mcp/execute`
- **AI Execution:** `POST /api/ai-execute`

### Example Usage

**Discover available tools:**

```bash
curl http://localhost:3001/api/mcp/tools
```

**Execute a tool:**

```bash
curl -X POST http://localhost:3001/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{"tool_name": "get_characters", "parameters": {"limit": 10}}'
```

**AI-powered natural language:**

```bash
curl -X POST http://localhost:3001/api/ai-execute \
  -d '{"prompt": "Show me all characters in House Stark"}'
```

## 🌐 Access Points

- **MCP Server:** http://localhost:3001
- **Frontend:** http://localhost:5173
- **Neo4j Browser:** http://localhost:7474

## 📊 Data

The database contains Game of Thrones data from all 8 seasons:

- **Characters:** 126+ characters with house affiliations
- **Relationships:** 549+ interactions between characters
- **Seasons:** Data from seasons 1-8

## 🔍 MCP Specification Compliance

This server implements the Model Context Protocol specification:

- **Tool Discovery:** AI agents can discover available capabilities
- **Structured Schemas:** JSON Schema validation for all tools
- **Type Safety:** Strong typing for input/output parameters
- **Error Handling:** Comprehensive error handling and feedback

## 🤖 AI Integration

The server includes an AI execution endpoint that:

- Uses OpenAI to understand natural language requests
- Automatically selects appropriate MCP tools
- Provides intelligent fallback when AI is unavailable
- Returns structured results with execution details

## 📝 License

ISC License
