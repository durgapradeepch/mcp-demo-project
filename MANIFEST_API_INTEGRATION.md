# Manifest API Integration

## Overview

The MCP server has been successfully integrated with the Manifest API, providing access to changelogs, incidents, tickets, notifications, resources, and graph data.

## Configuration

### Environment Variables

The following environment variables have been added to `.env`:

```env
MANIFEST_API_URL=https://api.dev.manifestit.tech
MANIFEST_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### API Scopes

The API key has the following read permissions:

- ✅ changelogs:read
- ✅ graph:read
- ✅ incidents:read
- ✅ notifications:read
- ✅ resources:read
- ✅ tickets:read

## Available MCP Tools

### 1. get_changelogs

Retrieve changelogs from the Manifest API.

**Parameters:**

- `limit` (integer, optional): Maximum number of changelogs to return (default: 50)
- `offset` (integer, optional): Number of changelogs to skip (default: 0)

**Example:**

```bash
curl -X POST http://localhost:3001/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_name": "get_changelogs",
    "parameters": {
      "limit": 10
    }
  }'
```

### 2. get_graph

Retrieve graph data from the Manifest API.

**Parameters:**

- `graph_type` (string, optional): Type of graph to retrieve

**Example:**

```bash
curl -X POST http://localhost:3001/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_name": "get_graph",
    "parameters": {}
  }'
```

### 3. get_incidents

Retrieve incidents from the Manifest API.

**Parameters:**

- `status` (string, optional): Filter by incident status (e.g., 'open', 'closed')
- `limit` (integer, optional): Maximum number of incidents to return (default: 50)

**Example:**

```bash
curl -X POST http://localhost:3001/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_name": "get_incidents",
    "parameters": {
      "status": "open",
      "limit": 20
    }
  }'
```

### 4. get_notifications

Retrieve notifications from the Manifest API.

**Parameters:**

- `limit` (integer, optional): Maximum number of notifications to return (default: 50)

**Example:**

```bash
curl -X POST http://localhost:3001/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_name": "get_notifications",
    "parameters": {
      "limit": 25
    }
  }'
```

### 5. get_resources

Retrieve resources from the Manifest API.

**Parameters:**

- `resource_type` (string, optional): Filter by resource type
- `limit` (integer, optional): Maximum number of resources to return (default: 50)

**Example:**

```bash
curl -X POST http://localhost:3001/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_name": "get_resources",
    "parameters": {
      "limit": 30
    }
  }'
```

### 6. get_tickets

Retrieve tickets from the Manifest API.

**Parameters:**

- `status` (string, optional): Filter by ticket status
- `limit` (integer, optional): Maximum number of tickets to return (default: 50)

**Example:**

```bash
curl -X POST http://localhost:3001/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool_name": "get_tickets",
    "parameters": {
      "status": "open",
      "limit": 15
    }
  }'
```

## AI-Powered Queries

You can also use natural language queries through the AI execution endpoint:

```bash
# Get incidents
curl -X POST http://localhost:3001/api/ai-execute \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Show me all open incidents"
  }'

# Get changelogs
curl -X POST http://localhost:3001/api/ai-execute \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Get the latest changelogs"
  }'

# Get tickets
curl -X POST http://localhost:3001/api/ai-execute \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Show me recent tickets"
  }'

# Get notifications
curl -X POST http://localhost:3001/api/ai-execute \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What notifications do I have?"
  }'
```

## Integration Details

### Authentication

All Manifest API requests include the JWT token in the Authorization header:

```
Authorization: Bearer <MANIFEST_API_KEY>
```

### Error Handling

- Invalid API responses return descriptive error messages
- Network timeouts are set to 30 seconds
- All errors are properly logged and returned to the client

### Similar to VictoriaLogs

The Manifest API integration follows the same pattern as VictoriaLogs:

1. Configuration stored in `config.js`
2. Tool definitions in `MCP_TOOLS` object
3. Implementation methods in `MCPToolRegistry` class
4. AI routing in the fallback system

## Testing

To verify the integration:

1. **Check available tools:**

```bash
curl http://localhost:3001/api/mcp/tools | jq '.tools[] | select(.name | contains("get_"))'
```

2. **Test a specific tool:**

```bash
curl -X POST http://localhost:3001/api/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{"tool_name": "get_incidents", "parameters": {"limit": 5}}'
```

3. **Test AI execution:**

```bash
curl -X POST http://localhost:3001/api/ai-execute \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Show me incidents"}'
```

## Notes

- The API key expires on: **October 22, 2027** (extracted from JWT payload)
- Organization key: `demo`
- All tools are read-only operations
- The integration works in fallback mode without OpenAI API key

## Next Steps

To use the Manifest API data in your application:

1. Update the frontend to include Manifest API data visualization
2. Create custom dashboards for incidents, tickets, and changelogs
3. Add filters and search capabilities
4. Implement real-time updates if the API supports webhooks
