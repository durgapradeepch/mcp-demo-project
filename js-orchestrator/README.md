# JavaScript LangGraph Orchestrator

A powerful Node.js implementation of the LangGraph orchestrator, converted from Python to JavaScript for better integration with authentication and rate limiting systems.

## 🚀 Features

- **Multi-Agent Orchestration**: Coordinated workflow using XState state machines
- **Enhanced Multi-Query Processing**: Parallel and sequential query execution with intelligent planning
- **OpenAI Integration**: Direct integration with OpenAI SDK for LLM capabilities
- **MCP Client**: HTTP-based client for Model Context Protocol server communication
- **Express.js API**: RESTful endpoints with comprehensive middleware
- **Security & Performance**: Rate limiting, CORS, helmet security, compression
- **Comprehensive Logging**: Winston-based logging with configurable levels and transports
- **Environment Configuration**: Flexible configuration system with environment variables

## 📁 Architecture

```
js-orchestrator/
├── agents/                    # Specialized processing agents
│   ├── query_analysis_agent.js      # Query intent analysis
│   ├── tool_execution_agent.js      # MCP tool execution
│   ├── incident_analysis_agent.js   # Incident correlation analysis
│   └── response_enrichment_agent.js # Response enhancement
├── config/
│   └── settings.js           # Configuration management
├── utils/
│   ├── llm_client.js        # OpenAI SDK integration
│   └── mcp_client.js        # MCP server communication
├── logs/                    # Log files directory
├── state.js                 # State management system
├── orchestrator.js          # Main orchestration logic
├── workflow.js              # Basic XState workflow
├── enhanced_workflow.js     # Multi-query workflow
└── server.js               # Express.js server
```

## 🛠️ Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Environment setup**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Required environment variables**:
- `OPENAI_API_KEY`: Your OpenAI API key
- `MCP_SERVER_URL`: URL of your MCP server (default: http://localhost:3001)

## 🚀 Usage

### Starting the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:8000` (configurable via `PORT` environment variable).

### API Endpoints

#### Health Check
```http
GET /health
```

#### Server Status
```http
GET /status
```

#### Basic Chat
```http
POST /chat
Content-Type: application/json

{
  "query": "What incidents occurred in the last hour?",
  "session_id": "optional-session-id"
}
```

#### Enhanced Multi-Query Chat
```http
POST /chat/enhanced
Content-Type: application/json

{
  "query": "What incidents occurred today and what was their root cause? Also show me the system status.",
  "session_id": "optional-session-id"
}
```

#### Workflow Status
```http
GET /workflow/status
```

#### Session Management
```http
# Get session status
GET /session/{session_id}

# Stop session
DELETE /session/{session_id}
```

#### MCP Integration
```http
# MCP server health
GET /mcp/health

# Available MCP tools
GET /mcp/tools
```

## 🔧 Configuration

Configuration is managed through environment variables. See `.env.example` for all available options.

### Key Configuration Sections

- **Server**: Host, port, environment settings
- **LLM**: OpenAI API configuration
- **MCP**: MCP server connection settings
- **Security**: Rate limiting, CORS, helmet configuration
- **Logging**: Winston logger configuration
- **Workflow**: Orchestration behavior settings

## 🏗️ Architecture Details

### State Management

The orchestrator uses immutable state management with the following key functions:

```javascript
import { createInitialState, updateStateContext, addMCPResult } from './state.js';

// Create new state
const state = createInitialState("What's the system status?");

// Update context
const updatedState = updateStateContext(state, { phase: 'analysis' });

// Add MCP results
const finalState = addMCPResult(updatedState, mcpResult);
```

### Workflow Orchestration

#### Basic Workflow
Uses XState for deterministic state machine orchestration:

```javascript
import LangGraphWorkflow from './workflow.js';

const workflow = new LangGraphWorkflow(mcpClient);
const result = await workflow.processQuery("Your query here");
```

#### Enhanced Workflow
Supports complex multi-query processing:

```javascript
import EnhancedLangGraphWorkflow from './enhanced_workflow.js';

const enhancedWorkflow = new EnhancedLangGraphWorkflow(mcpClient);
const result = await enhancedWorkflow.processComplexQuery("Complex multi-part query");
```

### Agent System

Each agent handles specific aspects of query processing:

- **QueryAnalysisAgent**: Analyzes user intent and query structure
- **ToolExecutionAgent**: Manages MCP tool execution with retry logic
- **IncidentAnalysisAgent**: Performs specialized incident analysis
- **ResponseEnrichmentAgent**: Enhances responses with additional context

## 🔄 Migration from Python

This JavaScript implementation maintains full compatibility with the original Python version while adding:

- **Better Performance**: Native JavaScript async/await patterns
- **Easier Integration**: Direct integration with Node.js auth and rate limiting
- **Modern Tooling**: ES modules, comprehensive JSDoc typing
- **Enhanced Security**: Express.js security middleware ecosystem

### Key Differences

- **State Machines**: XState replaces LangGraph for workflow orchestration
- **HTTP Client**: Axios replaces Python requests for MCP communication
- **Logging**: Winston replaces Python logging
- **Configuration**: Environment-based configuration system

## 🐛 Debugging

### Enable Debug Logging
```bash
export LOG_LEVEL=debug
npm start
```

### Test Endpoints
```bash
# Test MCP connection
curl -X POST http://localhost:8000/test -H "Content-Type: application/json" -d '{"test_type": "mcp_connection"}'

# Test workflow initialization
curl -X POST http://localhost:8000/test -H "Content-Type: application/json" -d '{"test_type": "workflow_init"}'
```

## 📊 Monitoring

The server provides comprehensive metrics and status endpoints:

- **Health Check**: Basic server health
- **Status**: Detailed server and workflow status
- **Session Tracking**: Active session monitoring
- **Performance Metrics**: Request counts, error rates, execution times

## 🔒 Security

- **Rate Limiting**: Configurable per-IP rate limits
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers and CSP
- **Input Validation**: Request body size limits and validation
- **Error Handling**: Secure error responses without information leakage

## 🚀 Production Deployment

1. **Environment Setup**:
```bash
export NODE_ENV=production
export LOG_LEVEL=warn
export LOG_FILE=true
```

2. **Process Management**: Use PM2 or similar:
```bash
npm install -g pm2
pm2 start server.js --name "js-orchestrator"
```

3. **Reverse Proxy**: Use nginx or similar for SSL termination and load balancing

## 📝 Development

### Adding New Agents

1. Create agent in `agents/` directory
2. Implement required methods: `constructor`, main processing method
3. Add agent to workflow in `workflow.js` or `enhanced_workflow.js`
4. Update state machine transitions as needed

### Adding New Endpoints

1. Add route in `server.js` `_setupRoutes()` method
2. Implement request validation
3. Add proper error handling
4. Update documentation

## 🤝 Contributing

1. Follow existing code patterns and JSDoc documentation
2. Add comprehensive error handling
3. Include logging for debugging
4. Test with both basic and enhanced workflows
5. Update README for any new features

## 📄 License

Same license as the original Python implementation.