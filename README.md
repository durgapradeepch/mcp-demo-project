# Neo4j MCP Server with VictoriaLogs Integration# Neo4j MCP Project



A Model Context Protocol (MCP) server that provides dual integration with Neo4j (for Game of Thrones character data) and VictoriaLogs (for log analytics), featuring AI-powered query routing.A Model Context Protocol (MCP) server that provides AI agents with tools to interact with a Neo4j database containing Game of Thrones character and relationship data.



## Features## 🚀 Project Structure



- **Dual Data Sources**: Neo4j graph database + VictoriaLogs time-series logging```

- **AI Query Routing**: OpenAI-powered intelligent routing between data sourcesneo4j-mcp-project/

- **13 MCP Tools**: 9 Neo4j tools + 4 VictoriaLogs tools├── mcp-server/          # MCP Server with Neo4j integration

- **React Frontend**: Interactive UI for testing queries├── frontend/            # React frontend application

- **Game of Thrones Dataset**: Complete character relationships and house data├── graph_data/          # Neo4j database and Game of Thrones data

└── README.md            # This file

## Quick Start```



### Prerequisites## 🛠️ MCP Tools Available



- Node.js 18+ The server provides the following MCP tools for AI agents:

- Docker (for Neo4j)

- OpenAI API Key### Data Retrieval Tools

- **`get_characters`** - Retrieve characters with optional house filtering

### 1. Clone and Install- **`get_relationships`** - Get relationships between characters

- **`search_characters`** - Search characters by name

```bash- **`get_database_stats`** - Get database statistics

git clone https://github.com/durgapradeepch/mcp-chatbot-demo.git

cd mcp-chatbot-demo### Data Modification Tools

- **`create_character`** - Add new characters to the database

# Install MCP server dependencies- **`create_relationship`** - Create relationships between characters

cd mcp-server- **`update_character`** - Modify character information

npm install- **`delete_character`** - Remove characters and their relationships



# Install frontend dependencies  ## 🔧 Getting Started

cd ../frontend

npm install### Prerequisites

cd ..- Node.js (v16 or higher)

```- Neo4j database running on port 7474



### 2. Environment Setup### Installation



```bash1. **Start the MCP Server:**

# Copy environment template   ```bash

cd mcp-server   cd mcp-server

cp .env.example .env   npm install

   npm start

# Edit .env and add your OpenAI API key   ```

nano .env

```2. **Start the Frontend:**

   ```bash

### 3. Start Neo4j with Game of Thrones Data   cd frontend

   npm install

```bash   npm run dev

# Start Neo4j container with data volume   ```

docker run -d \

  --name neo4j-got \### MCP Endpoints

  -p 7474:7474 -p 7687:7687 \

  -v $(pwd)/graph_data/data:/data \- **Tool Discovery:** `GET /api/mcp/tools`

  -e NEO4J_AUTH=neo4j/password \- **Tool Execution:** `POST /api/mcp/execute`

  neo4j:latest- **AI Execution:** `POST /api/ai-execute`

```

### Example Usage

### 4. Run the Application

**Discover available tools:**

```bash```bash

# Terminal 1: Start MCP Servercurl http://localhost:3001/api/mcp/tools

cd mcp-server```

npm start

**Execute a tool:**

# Terminal 2: Start Frontend  ```bash

cd frontendcurl -X POST http://localhost:3001/api/mcp/execute \

npm run dev  -H "Content-Type: application/json" \

```  -d '{"tool_name": "get_characters", "parameters": {"limit": 10}}'

```

### 5. Access the Applications

**AI-powered natural language:**

- **Frontend**: http://localhost:5173```bash

- **Neo4j Browser**: http://localhost:7474curl -X POST http://localhost:3001/api/ai-execute \

- **MCP Server**: http://localhost:3001  -d '{"prompt": "Show me all characters in House Stark"}'

```

## API Examples

## 🌐 Access Points

### Character Queries (Neo4j)

```bash- **MCP Server:** http://localhost:3001

curl -X POST http://localhost:3001/api/ai-execute \- **Frontend:** http://localhost:5173

  -H "Content-Type: application/json" \- **Neo4j Browser:** http://localhost:7474

  -d '{"prompt": "Who are the Stark family members?"}'

```## 📊 Data



### Log Queries (VictoriaLogs)The database contains Game of Thrones data from all 8 seasons:

```bash- **Characters:** 126+ characters with house affiliations

curl -X POST http://localhost:3001/api/ai-execute \- **Relationships:** 549+ interactions between characters

  -H "Content-Type: application/json" \- **Seasons:** Data from seasons 1-8

  -d '{"prompt": "Show me error logs from the last 30 minutes"}'

```## 🔍 MCP Specification Compliance



## MCP Tools AvailableThis server implements the Model Context Protocol specification:

- **Tool Discovery:** AI agents can discover available capabilities

### Neo4j Tools (9)- **Structured Schemas:** JSON Schema validation for all tools

- `get_characters` - Retrieve character information- **Type Safety:** Strong typing for input/output parameters

- `get_relationships` - Get character relationships  - **Error Handling:** Comprehensive error handling and feedback

- `search_characters` - Search characters by name/house

- `create_character` - Add new characters## 🤖 AI Integration

- `create_relationship` - Add new relationships

- `update_character` - Modify character dataThe server includes an AI execution endpoint that:

- `delete_character` - Remove characters- Uses OpenAI to understand natural language requests

- `fix_house_assignments` - Fix house assignments- Automatically selects appropriate MCP tools

- `get_database_stats` - Database statistics- Provides intelligent fallback when AI is unavailable

- Returns structured results with execution details

### VictoriaLogs Tools (4)

- `query_logs` - Execute LogsQL queries## 📝 License

- `search_logs` - Search logs by content

- `get_log_fields` - Get available log fieldsISC License

- `get_log_stats` - Log statistics and metrics

## Dataset Information

The Neo4j database contains:
- **126 characters** from Game of Thrones
- **549 relationships** between characters
- **11 houses** with hierarchical structure
- **8 seasons** of interaction data

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: Neo4j (graph), VictoriaLogs (time-series)
- **AI**: OpenAI GPT-3.5-turbo
- **Frontend**: React, Vite
- **Protocol**: Model Context Protocol (MCP)

## Development

```bash
# Watch mode for server
cd mcp-server  
npm run dev

# Development frontend
cd frontend
npm run dev
```

## Environment Variables

Create `mcp-server/.env`:

```env
OPENAI_API_KEY=your-openai-api-key-here
NEO4J_URL=http://localhost:7474
NEO4J_USER=neo4j
NEO4J_PASS=password
SERVER_PORT=3001
VICTORIA_LOGS_URL=https://vlinsert.dev.manifestit.tech/select/vmui
VICTORIA_LOGS_API_URL=https://vlinsert.dev.manifestit.tech/select/logsql
```

## Project Structure

```
├── mcp-server/          # MCP server with dual integration
├── frontend/            # React frontend application  
├── graph_data/          # Neo4j data and Game of Thrones dataset
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## License

MIT License