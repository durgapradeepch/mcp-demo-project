# MCP Demo Project: Multi-Agent AI Orchestration System

🚀 **A sophisticated multi-agent AI orchestration system** that combines Neo4j graph databases, VictoriaLogs, Manifest API integration, and intelligent LangGraph workflows to create a powerful chatbot capable of complex data analysis, incident management, and system monitoring.

## 📖 **Comprehensive Documentation**

🔥 **[READ THE COMPLETE SYSTEM GUIDE →](./COMPREHENSIVE_README.md)** 🔥

For detailed architecture, deployment instructions, development guides, and system integration details, see the comprehensive documentation.

## ⚡ Quick Start (JavaScript Version)

**New JavaScript LangGraph Orchestrator** - Better performance and easier auth integration!

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

- Docker and Docker Compose
- Node.js (v16 or higher) - optional, for development
- Python 3.11+ - optional, for development

### 🚀 JavaScript Version (Recommended)

```bash
# Start the new JavaScript orchestrator system
./start-js.sh

# Access the chatbot
open http://localhost:5173
```

### 🐍 Python Version (Legacy)

```bash  
# Start the original Python system
./start.sh
```

**Stop services:**
```bash
./stop-js.sh    # For JavaScript version
./stop.sh       # For Python version  
```

### Development Mode

For development, you can run individual services:

1. **MCP Server only:**
   ```bash
   cd mcp-server && npm install && npm start
   ```

2. **LangGraph Orchestrator only:**
   ```bash
   cd langgraph-orchestrator && pip install -r requirements.txt && python server.py
   ```

3. **Frontend only:**
   ```bash
   cd frontend && npm install && npm run dev
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

### JavaScript System (Port 8003)
- **🤖 Chatbot Interface:** http://localhost:5173
- **🚀 JS Orchestrator API:** http://localhost:8003
- **🔧 MCP Server API:** http://localhost:3001  
- **🗄️ Neo4j Database:** http://localhost:7474 (neo4j/testing@neo4j)

### Python System (Port 8000) 
- **🐍 Python Orchestrator:** http://localhost:8000
- **📊 Health & Status:** http://localhost:8000/health

## 🎯 System Capabilities  

### 🤖 **Multi-Agent Orchestration**
- **Query Analysis:** Intent recognition and entity extraction
- **Tool Execution:** Smart MCP tool selection and coordination
- **Incident Analysis:** Advanced correlation analysis and root cause identification  
- **Response Enrichment:** Context-aware response generation with actionable insights

### 🔧 **Data Integration**
- **Neo4j Graph:** Complex relationship queries and graph analytics
- **VictoriaLogs:** Time-series log analysis and pattern detection
- **Manifest API:** External system integration (incidents, resources, tickets)
- **41+ MCP Tools:** Comprehensive toolkit for system analysis

### 🚀 **JavaScript Advantages**
- **Better Performance:** Native async/await, no Python GIL limitations
- **Easier Auth Integration:** Express.js middleware ecosystem  
- **Production Ready:** Built-in rate limiting, security headers, monitoring
- **Unified Stack:** JavaScript from frontend to orchestrator

## � Example Queries

Try these queries in the chatbot interface:

```
🔍 "What is the current system status?"
🚨 "Show me recent incidents affecting the payment service" 
📊 "Get database statistics and health metrics"
🔧 "What tools are available for log analysis?"
⚡ "Search for error logs from the last hour"
📈 "Analyze patterns in recent incidents"
🌐 "Show me all resources and their relationships"
```

## 📊 Sample Data

The system includes rich demo data:

- **Neo4j Graph:** Game of Thrones characters and relationships (126+ characters, 549+ relationships)
- **VictoriaLogs:** System logs and metrics for demonstration
- **Manifest API:** Sample incidents, resources, and tickets for testing

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
