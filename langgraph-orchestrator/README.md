# LangGraph MCP Orchestrator

A sophisticated state management and orchestration system for MCP (Model Context Protocol) chatbots using LangGraph for intelligent workflow management.

## 🎯 Overview

This system transforms simple user queries into comprehensive investigations through:

- **Intelligent Query Analysis**: NLP-powered intent detection and entity extraction
- **Dynamic Tool Orchestration**: Smart sequencing of MCP tool executions  
- **Incident Analysis**: Specialized workflows for root cause investigation
- **State Management**: Persistent context across multi-turn conversations
- **Response Enrichment**: Forward linking and contextual annotations

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Server    │◄───┤ LangGraph Agent  │───►│   Your Frontend │
│   (Node.js)     │    │   Orchestrator   │    │    (React)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Specialized     │
                    │    Agents        │
                    │ • Query Analysis │
                    │ • Tool Execution │
                    │ • Incident       │
                    │ • Response       │
                    └──────────────────┘
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd langgraph-orchestrator
pip install -r requirements.txt
```

### 2. Configuration

Copy and customize the environment file:

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start the Orchestrator

```bash
python server.py
```

The orchestrator will be available at `http://localhost:8000`

### 4. Test the Integration

```bash
# Health check
curl http://localhost:8000/health

# Test query processing
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"user_query": "What caused the recent errors?", "session_id": "test"}'
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_SERVER_URL` | URL of your MCP server | `http://localhost:3001` |
| `LANGGRAPH_PORT` | Port for LangGraph server | `8000` |
| `LOG_LEVEL` | Logging level | `info` |
| `MAX_RETRIES` | Max retries for failed operations | `3` |
| `STAGE_TIMEOUT` | Timeout per workflow stage (seconds) | `60` |

## 📊 Workflow Stages

### 1. **Query Analysis**
- Intent detection (incident, exploration, root cause)
- Entity extraction (resource IDs, timestamps, severity)
- Confidence scoring and specificity assessment

### 2. **Tool Planning** 
- Dynamic tool sequence generation
- Dependency resolution
- Priority-based execution planning

### 3. **Tool Execution**
- Parallel execution with error handling
- Context-aware parameter building
- Retry logic with exponential backoff

### 4. **Incident Analysis** (Conditional)
- Timeline reconstruction
- Correlation analysis between events
- Root cause identification
- Impact assessment

### 5. **Response Enrichment**
- Forward link generation
- Contextual annotations
- Actionable recommendations

## 🛠️ API Endpoints

### Core Endpoints

- `POST /chat` - Process user queries through the full workflow
- `GET /health` - Comprehensive health check
- `GET /status` - System metrics and status
- `GET /tools` - List available MCP tools

### Debug Endpoints

- `POST /debug/simulate-query` - Simulate different query types
- `POST /validate-tools` - Validate MCP tool availability

## 📈 Example Workflow

**User Query**: "What has caused some error?"

**Orchestrator Response**:
1. **Analysis**: Detects "incident_analysis" intent, low specificity
2. **Planning**: Sequences tools: `search_logs` → `get_incidents` → `search_changelogs`
3. **Execution**: Runs tools in parallel where possible
4. **Investigation**: Correlates errors with recent changes
5. **Enrichment**: Suggests "Check deployment logs", "Review recent config changes"

## 🔍 Advanced Features

### State Management
```python
# Persistent conversation context
state = {
    "user_query": "What caused errors?",
    "query_type": "incident_analysis", 
    "executed_tools": ["search_logs", "get_incidents"],
    "correlations": [...],
    "forward_links": ["Investigate deployment X", "Check resource Y"]
}
```

### Intelligent Tool Sequencing
- **Dependency Resolution**: Ensures `get_resource_by_id` runs before `get_resource_tickets`
- **Context Building**: Uses results from early tools to enhance later tool parameters
- **Parallel Execution**: Runs independent tools concurrently

### Quality Control
- **Confidence Scoring**: Tracks analysis confidence at each stage
- **Error Recovery**: Graceful degradation with retry logic
- **Health Monitoring**: Tracks success rates and performance metrics

## 🐛 Troubleshooting

### Common Issues

1. **MCP Server Connection Failed**
   ```bash
   # Check MCP server is running
   curl http://localhost:3001/api/mcp/tools
   ```

2. **Import Errors**
   ```bash
   # Ensure all dependencies are installed
   pip install -r requirements.txt
   ```

3. **Workflow Timeouts**
   ```bash
   # Increase timeout in .env
   STAGE_TIMEOUT=120.0
   ```

## 📝 Development

### Running Tests
```bash
pytest tests/ -v
```

### Code Quality
```bash
black . --check
flake8 .
mypy .
```

### Docker Development
```bash
docker build -t langgraph-orchestrator .
docker run -p 8000:8000 langgraph-orchestrator
```

## 🤝 Integration with MCP Server

Update your MCP server to use the orchestrator:

```javascript
// mcp-server/server.js
app.post('/api/langgraph-execute', async (req, res) => {
  try {
    const response = await axios.post('http://localhost:8000/chat', {
      user_query: req.body.user_query,
      session_id: req.body.session_id
    });
    
    res.json(response.data);
  } catch (error) {
    // Fallback to existing logic
    return handleAIExecute(req, res);
  }
});
```

## 📄 License

ISC License