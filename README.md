

## 🚀 Project Structure

```
mcp-demo-project/
├── mcp-server/           # Advanced MCP Server with multi-source integration
│   ├── server.js         # Main server with 45+ MCP tools and LLM-based routing
│   ├── config.js         # Configuration for Neo4j, VictoriaLogs, and Manifest API
│   └── package.json      # Dependencies including OpenAI integration
├── frontend/             # React frontend with Vite
│   ├── src/              # React components and UI
│   └── package.json      # Frontend dependencies
├── neo4j-init/           # Neo4j initialization scripts
├── docker-compose.yml    # Neo4j database container
└── README.md             # This file
```

## 🛠️ MCP Tools Available (45+ Tools)

The server provides an extensive collection of MCP tools organized by category:

### 🗄️ Neo4j Graph Database Tools (9 tools)
- **`get_neo4j_schema`** - Retrieve database schema information
- **`get_all_nodes`** - Get all nodes with optional type filtering  
- **`get_all_relationships`** - Get all relationships with optional type filtering
- **`get_node_by_id`** - Retrieve specific node by ID
- **`get_relationships_by_node`** - Get relationships for a specific node
- **`create_node`** - Create new nodes in the database
- **`create_relationship`** - Create relationships between nodes
- **`update_node`** - Update existing node properties
- **`execute_cypher_query`** - Execute custom Cypher queries

### 📊 VictoriaLogs Tools (4 tools)
- **`query_victoria_logs`** - Execute LogSQL queries on log data
- **`get_log_streams`** - Retrieve available log streams
- **`search_logs_by_time`** - Time-based log search with filters
- **`aggregate_log_data`** - Perform log aggregations and analytics

### 🔧 Manifest API - Resources (8 tools)
- **`get_resource_list`** - List resources with filtering and pagination
- **`get_resource_by_id`** - Retrieve specific resource details
- **`search_resources`** - Search resources by various criteria
- **`get_resource_hierarchy`** - Get resource parent/child relationships
- **`get_resource_metadata`** - Retrieve resource metadata and tags
- **`get_resource_costs`** - Get resource cost information
- **`get_resource_health`** - Check resource health status
- **`update_resource_tags`** - Modify resource tags and labels

### 📝 Manifest API - Changelogs (6 tools)
- **`get_changelog_list`** - Get paginated changelog entries
- **`get_changelog_by_id`** - Retrieve specific changelog details
- **`get_changelog_list_by_resource`** - Get changelogs for specific resource
- **`search_changelogs`** - Search changelogs by criteria
- **`get_changelog_timeline`** - Get chronological changelog timeline
- **`analyze_changelog_trends`** - Analyze changelog patterns and trends

### 🚨 Manifest API - Incidents (6 tools)
- **`get_incident_list`** - List incidents with filtering
- **`get_incident_by_id`** - Get detailed incident information
- **`get_incidents_by_resource`** - Get incidents for specific resource
- **`search_incidents`** - Search incidents by various parameters
- **`get_incident_timeline`** - Get incident chronological timeline
- **`analyze_incident_patterns`** - Analyze incident trends and patterns

### 🎫 Manifest API - Tickets (6 tools)
- **`get_ticket_list`** - List support tickets with filtering
- **`get_ticket_by_id`** - Get detailed ticket information
- **`get_tickets_by_resource`** - Get tickets for specific resource
- **`search_tickets`** - Search tickets by criteria
- **`get_ticket_timeline`** - Get ticket lifecycle timeline
- **`analyze_ticket_metrics`** - Analyze ticket resolution metrics

### 🔔 Manifest API - Notifications (6 tools)
- **`get_notification_list`** - List notifications with filtering
- **`get_notification_by_id`** - Get specific notification details
- **`get_notifications_by_resource`** - Get notifications for resource
- **`search_notifications`** - Search notifications by parameters
- **`get_notification_timeline`** - Get notification chronological view
- **`analyze_notification_trends`** - Analyze notification patterns

### 🌐 Manifest API - Graph & Analytics (2 tools)
- **`get_resource_graph`** - Generate resource dependency graphs
- **`analyze_system_metrics`** - Perform cross-system analytics

## 🔧 Getting Started

### Prerequisites

- Docker and Docker Compose

   ```

3. **Stop everything:**
   ```bash
   ./stop.sh
   ```

### 🌐 Access Points

- **Chatbox Interface:** http://localhost:5173/
- **MCP Server API:** http://localhost:3001/
- **Neo4j Browser:** http://localhost:7474/
  - Username: `neo4j`
  - Password: `testing@neo4j`

## 📡 API Endpoints

### MCP Protocol Endpoints
- **Tool Discovery:** `GET /api/mcp/tools` - List all available MCP tools
- **Tool Execution:** `POST /api/mcp/execute` - Execute specific MCP tool
- **AI Execution:** `POST /api/ai-execute` - Natural language AI-powered tool selection

### Example Usage

**Discover available tools:**
```bash
curl http://localhost:3001/api/mcp/tools
```

**Execute a specific tool:**
```bash
curl -X POST http://localhost:3001/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{"tool_name": "get_resource_list", "parameters": {"limit": 10}}'
```

**AI-powered natural language queries:**
```bash
curl -X POST http://localhost:3001/api/ai-execute \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Get the changelog list for resource ID 5006081"}'
```

**Advanced queries:**
```bash
curl -X POST http://localhost:3001/api/ai-execute \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Show me all incidents for Kubernetes workloads in the last 7 days"}'
```

## 🤖 AI Integration Features

The server includes advanced AI capabilities:

### LLM-Based Tool Selection
- **Pure LLM Routing:** Uses OpenAI GPT-4o to intelligently select tools
- **No Pattern Matching:** Eliminated brittle pattern-matching router
- **Context Understanding:** Analyzes natural language intent
- **Tool Descriptions:** 45+ tools with detailed, distinctive descriptions

### Natural Language Processing
- **Conversational Interface:** Natural language input and output
- **Analytical Responses:** LLM analyzes results and provides insights
- **Data Interpretation:** Converts technical data into user-friendly summaries
- **Error Handling:** Intelligent error explanation and suggestions

### Response Formatting
- **Clean Output:** Removes technical JSON artifacts
- **Contextual Analysis:** Provides meaningful insights from raw data
- **List Formatting:** Organizes data (tickets, changelogs, etc.) in readable lists
- **No Markdown Clutter:** Clean paragraph responses without excessive formatting

## 📊 Data Sources

### Neo4j Graph Database
- **Nodes & Relationships:** Complex graph data modeling
- **Cypher Queries:** Advanced graph query capabilities
- **Schema Discovery:** Dynamic schema exploration
- **Real-time Updates:** Live data modification tools

### VictoriaLogs
- **LogSQL Queries:** Powerful log query language
- **Time-series Data:** Efficient log data analysis
- **Stream Processing:** Real-time log aggregation
- **Full-text Search:** Advanced log searching capabilities

### Manifest API
- **Enterprise Resources:** Infrastructure and workload management
- **Change Tracking:** Comprehensive changelog system
- **Incident Management:** Full incident lifecycle tracking
- **Support Tickets:** Complete ticketing system integration
- **Notifications:** Real-time alert and notification handling


The system has been extensively tested with:

- **Real Resource IDs:** Validated with actual system data (e.g., resource ID 5006081)
- **Tool Selection Accuracy:** LLM correctly selects appropriate tools
- **Data Integrity:** Verified API responses match requested parameters
- **Error Handling:** Robust error handling for missing data and invalid requests
- **Performance:** Optimized for concurrent tool execution

## 🏗️ Architecture

### Server Architecture
- **Express.js Backend:** RESTful API with comprehensive routing
- **Multi-Database Support:** Neo4j, VictoriaLogs, and REST APIs
- **Connection Pooling:** Efficient resource management
- **Configuration Management:** Environment-based configuration

### Tool Organization
- **Modular Design:** Tools organized by data source and functionality
- **Consistent Interfaces:** Standardized input/output patterns
- **Error Propagation:** Unified error handling across all tools
- **Logging:** Comprehensive request/response logging

### AI Integration
- **OpenAI Integration:** GPT-4o for tool selection and response analysis
- **Fallback Mechanisms:** Graceful degradation when AI unavailable
- **Context Preservation:** Maintains conversation context
- **Performance Optimization:** Efficient API usage and caching

## 🔐 Security & Configuration

### Security Best Practices

- **Environment Variables:** Secure credential management
- **API Authentication:** Configurable authentication for external APIs
- **Input Validation:** Comprehensive parameter validation
- **Rate Limiting:** Configurable request rate limiting
- **CORS Support:** Cross-origin resource sharing configuration

### Production Security Recommendations

**⚠️ CRITICAL: Neo4j Read-Only User**

The MCP server executes Cypher queries that could potentially modify your database. While the server includes regex-based validation to block destructive operations (DELETE, DROP, REMOVE), this is **not sufficient for production security**.

**Required for Production:**

1. Create a read-only Neo4j user:
   ```cypher
   CREATE USER mcp_readonly SET PASSWORD 'your_secure_password' CHANGE NOT REQUIRED;
   GRANT ROLE reader TO mcp_readonly;
   ```

2. Update `mcp-server/config.js` to use the read-only credentials:
   ```javascript
   NEO4J_USER: process.env.NEO4J_USER || 'mcp_readonly',
   NEO4J_PASSWORD: process.env.NEO4J_PASSWORD || 'your_secure_password'
   ```

3. For production deployments, always use database-level permissions rather than relying solely on application-layer validation.

**Why This Matters:**
- Regex patterns can be bypassed with creative SQL injection techniques
- Unicode obfuscation and APOC procedures can circumvent pattern matching
- Defense-in-depth: Multiple security layers are always better than one

### Deployment Configuration

**⚠️ SQLite Checkpoint Limitation**

The LangGraph orchestrator uses SQLite for conversation checkpointing. This is **suitable for development only**.

**For Production:**

- **Single Worker Only:** If using SQLite, run with `workers=1` to avoid database locking
- **Recommended:** Use PostgreSQL with `AsyncPostgresSaver` for multi-worker deployments
- **Issue:** Multiple processes writing to SQLite simultaneously will cause "Database Locked" errors

**Migration to PostgreSQL:**
```python
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

checkpointer = AsyncPostgresSaver.from_conn_string(
    "postgresql://user:pass@localhost:5432/langgraph_db"
)
```

## 🚀 Production Deployment

Ready for production with:

- **Docker Support:** Full containerization with docker-compose
- **Health Checks:** Automated service health monitoring
- **Logging:** Structured logging for monitoring and debugging
- **Configuration:** Environment-based configuration management
- **Scaling:** Horizontal scaling support for high availability

## 📝 License

ISC License

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests for new tools
4. Update tool descriptions for LLM clarity
5. Submit a pull request

## 📚 Additional Documentation

- **Tool Reference:** Complete documentation of all 45+ MCP tools
- **API Examples:** Comprehensive API usage examples
- **Configuration Guide:** Detailed configuration options
- **Troubleshooting:** Common issues and solutions
- **Performance Tuning:** Optimization guidelines

## ⚠️ Known Limitations & Production Considerations

### Context Window Management (mcp-server/server.js)

**Issue:** The `/api/ai-execute` endpoint sends descriptions and parameters for ALL 45+ tools to the LLM on every request.

**Impact:**
- Increased latency and API costs for every AI query
- Context window exhaustion if you add more tools (e.g., 60-70+ tools)
- Smaller models (GPT-3.5) may hit token limits

**Recommendations:**
1. **Tool Selector Pattern:** Implement a two-phase approach:
   - Phase 1: LLM selects tool category (Logs/Graph/Incidents)
   - Phase 2: Only inject tools from that category
2. **Semantic Tool Search:** Use embeddings to retrieve only relevant tools
3. **Tool Catalog Caching:** Cache tool descriptions in system prompt, only send tool names in requests

### Tool Dependency Management (tool_execution_agent.py)

**Issue:** Tool dependencies are hardcoded in Python (line 23-37):
```python
self.tool_dependencies = {
    "get_incident_changelogs": ["get_incident_by_id"],
    ...
}
```

**Risk:** If you rename a tool in `server.js` or `mcp_client.py`, this dependency graph silently breaks. Topological sort may fail or use incorrect ordering.

**Recommendations:**
1. **Centralized Tool Definitions:** Create a shared `tools_config.json` that both Python and Node.js read
2. **MCP Protocol Extension:** If using standard MCP, extend it to include dependency metadata
3. **Runtime Validation:** Add startup check that verifies all dependencies reference existing tools

### Session Management (langgraph-orchestrator/server.py)

**Issue:** If the frontend doesn't provide a `session_id`, the server generates one based on current timestamp.

**Risk:** If the frontend forgets to persist and return the `session_id`, every message starts a new conversation. The bot will have zero memory of previous interactions.

**Recommendations:**
1. **Client-Side Generation:** Have the frontend generate `session_id` on first load using `crypto.randomUUID()`
2. **Clear Response Flag:** Return `"is_new_session": true` in the first response so clients know to store it
3. **Cookie Fallback:** Use HTTP cookies to persist session ID if client doesn't support localStorage

### VictoriaLogs Count Reliability

**Fixed:** Added `count_is_exact` and `is_limited` flags to log query responses.

**Usage:** When `count_is_exact: false`, the `total_count` field is unreliable (fallback to returned count). LLM should phrase responses as "at least N logs" rather than "exactly N logs".

---

**Built with ❤️ using the Model Context Protocol for next-generation AI integration**
