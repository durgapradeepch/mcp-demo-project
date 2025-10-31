# LangGraph Integration Guide

This guide shows how to integrate the LangGraph orchestrator with your existing MCP chatbot to enable sophisticated state management and intelligent query processing.

## 🎯 Integration Overview

The LangGraph orchestrator acts as an intelligent middleware layer between your frontend and MCP server:

```
Frontend → LangGraph Orchestrator → MCP Server → Data Sources
   ↑              ↓                      ↓
   └── Enriched Response ←──────────────┘
```

## 🚀 Quick Setup

### 1. Start the Complete System

```bash
# Make sure you're in the project root
cd /Users/guru/Desktop/mcp-demo-project

# Start all services (Neo4j, MCP Server, LangGraph, Frontend)
./start-langgraph.sh
```

This will:
- Build and start all Docker containers
- Wait for services to be healthy
- Test the integration
- Display service URLs and sample commands

### 2. Test the Integration

```bash
# Test LangGraph directly
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"user_query": "What has caused some error?", "session_id": "demo"}'

# Check system health
curl http://localhost:8000/health
```

## 🔧 Frontend Integration Options

### Option 1: Direct LangGraph Integration (Recommended)

Update your frontend to call LangGraph directly for intelligent processing:

```javascript
// frontend/src/api/langgraph.js
const LANGGRAPH_API_URL = 'http://localhost:8000';

export async function processQueryWithLangGraph(userQuery, sessionId) {
  try {
    const response = await fetch(`${LANGGRAPH_API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_query: userQuery,
        session_id: sessionId
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      return {
        response: result.response,
        analysis: result.query_analysis,
        enrichment: result.enrichment,
        forwardLinks: result.enrichment.forward_links,
        annotations: result.enrichment.annotations
      };
    } else {
      throw new Error(result.error || 'Query processing failed');
    }
  } catch (error) {
    console.error('LangGraph error:', error);
    throw error;
  }
}
```

Update your chat component:

```javascript
// frontend/src/components/Chat.jsx
import { processQueryWithLangGraph } from '../api/langgraph';

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!prompt.trim() || loading) return;

  const userMessage = { role: 'user', content: prompt.trim(), timestamp: new Date() };
  setMessages(prev => [...prev, userMessage]);
  setPrompt('');
  setLoading(true);

  try {
    // Try LangGraph first
    const result = await processQueryWithLangGraph(userMessage.content, sessionId);
    
    const aiMessage = {
      role: 'ai',
      content: result.response,
      analysis: result.analysis,
      enrichment: result.enrichment,
      forwardLinks: result.forwardLinks,
      annotations: result.annotations,
      timestamp: new Date(),
      source: 'langgraph'
    };
    
    setMessages(prev => [...prev, aiMessage]);
    
  } catch (error) {
    console.error('LangGraph failed, falling back to MCP:', error);
    
    // Fallback to direct MCP server
    try {
      const response = await axios.post(`${API_BASE}/ai-execute`, { 
        prompt: userMessage.content 
      });
      
      const aiMessage = {
        role: 'ai',
        content: response.data.message,
        timestamp: new Date(),
        source: 'mcp-direct'
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
    } catch (fallbackError) {
      console.error('Both LangGraph and MCP failed:', fallbackError);
      const errorMessage = {
        role: 'ai',
        content: 'I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  }
  
  setLoading(false);
};
```

### Option 2: MCP Server Integration

Add a new endpoint to your MCP server that routes to LangGraph:

```javascript
// mcp-server/server.js - Add this endpoint
app.post('/api/langgraph-execute', async (req, res) => {
  try {
    const { prompt, session_id } = req.body;
    
    logger.info('🚀 Routing to LangGraph orchestrator');
    
    // Call LangGraph orchestrator
    const response = await axios.post('http://langgraph-orchestrator:8000/chat', {
      user_query: prompt,
      session_id: session_id || 'mcp-session'
    }, {
      timeout: 120000 // 2 minutes timeout
    });
    
    if (response.data.success) {
      res.json({
        success: true,
        message: response.data.response,
        orchestration_details: {
          query_analysis: response.data.query_analysis,
          execution_summary: response.data.execution_summary,
          enrichment: response.data.enrichment
        },
        source: 'langgraph'
      });
    } else {
      throw new Error(response.data.error || 'LangGraph processing failed');
    }
    
  } catch (error) {
    logger.error('❌ LangGraph routing failed:', error.message);
    
    // Fallback to existing AI logic
    logger.info('🔄 Falling back to direct MCP processing');
    return handleAIExecute(req, res);
  }
});
```

Update your frontend to use the new endpoint:

```javascript
// Try LangGraph through MCP server
const response = await axios.post(`${API_BASE}/langgraph-execute`, { 
  prompt: userMessage.content,
  session_id: sessionId
});
```

## 🎨 Enhanced UI Components

### Forward Links Component

```javascript
// frontend/src/components/ForwardLinks.jsx
import React from 'react';

const ForwardLinks = ({ links, onLinkClick }) => {
  if (!links || links.length === 0) return null;

  return (
    <div className="forward-links">
      <h4>🔗 Suggested Next Steps</h4>
      <ul className="links-list">
        {links.map((link, index) => (
          <li key={index}>
            <button 
              className="link-button"
              onClick={() => onLinkClick(link)}
            >
              {link}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ForwardLinks;
```

### Analysis Details Component

```javascript
// frontend/src/components/AnalysisDetails.jsx
import React, { useState } from 'react';

const AnalysisDetails = ({ analysis, executionSummary, enrichment }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="analysis-details">
      <button 
        className="toggle-details"
        onClick={() => setExpanded(!expanded)}
      >
        📊 Analysis Details {expanded ? '▼' : '▶'}
      </button>
      
      {expanded && (
        <div className="details-content">
          <div className="analysis-section">
            <h5>Query Analysis</h5>
            <p>Type: <span className="tag">{analysis.query_type}</span></p>
            <p>Intent: <span className="tag">{analysis.intent}</span></p>
            <p>Confidence: <span className="confidence">{(analysis.confidence_score * 100).toFixed(0)}%</span></p>
          </div>
          
          <div className="execution-section">
            <h5>Execution Summary</h5>
            <p>Tools: {executionSummary.tools_executed}/{executionSummary.tools_planned}</p>
            <p>Success Rate: {(executionSummary.success_rate * 100).toFixed(0)}%</p>
            <p>Investigation Depth: {executionSummary.investigation_depth}</p>
          </div>
          
          {enrichment.contextual_insights && (
            <div className="insights-section">
              <h5>Key Insights</h5>
              {enrichment.contextual_insights.key_findings.map((finding, index) => (
                <div key={index} className="finding">
                  <span className="confidence-indicator">
                    {finding.confidence > 0.8 ? '🔴' : finding.confidence > 0.6 ? '🟡' : '⚪'}
                  </span>
                  {finding.finding}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalysisDetails;
```

### Enhanced Message Component

```javascript
// frontend/src/components/Message.jsx
import React from 'react';
import ForwardLinks from './ForwardLinks';
import AnalysisDetails from './AnalysisDetails';

const Message = ({ message, onForwardLinkClick }) => {
  const isAI = message.role === 'ai';
  const isLangGraph = message.source === 'langgraph';

  return (
    <div className={`message ${message.role}`}>
      <div className="message-content">
        {message.content}
        
        {/* Show source indicator */}
        {isAI && (
          <div className="source-indicator">
            {isLangGraph ? '🧠 LangGraph' : '🔧 Direct MCP'}
          </div>
        )}
        
        {/* Show annotations if available */}
        {message.annotations && message.annotations.length > 0 && (
          <div className="annotations">
            {message.annotations.map((annotation, index) => (
              <div key={index} className="annotation">
                {annotation}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Enhanced features for LangGraph responses */}
      {isLangGraph && (
        <div className="langgraph-enhancements">
          <ForwardLinks 
            links={message.forwardLinks}
            onLinkClick={onForwardLinkClick}
          />
          
          <AnalysisDetails
            analysis={message.analysis}
            executionSummary={message.executionSummary}
            enrichment={message.enrichment}
          />
        </div>
      )}
    </div>
  );
};

export default Message;
```

## 📊 Monitoring and Analytics

### Health Dashboard

Create a simple health dashboard to monitor the system:

```javascript
// frontend/src/components/HealthDashboard.jsx
import React, { useState, useEffect } from 'react';

const HealthDashboard = () => {
  const [health, setHealth] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const [healthRes, statusRes] = await Promise.all([
          fetch('http://localhost:8000/health'),
          fetch('http://localhost:8000/status')
        ]);
        
        setHealth(await healthRes.json());
        setStatus(await statusRes.json());
      } catch (error) {
        console.error('Health check failed:', error);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Update every 30s
    
    return () => clearInterval(interval);
  }, []);

  if (!health || !status) return <div>Loading health status...</div>;

  return (
    <div className="health-dashboard">
      <h3>🏥 System Health</h3>
      
      <div className="health-grid">
        <div className={`health-card ${health.status}`}>
          <h4>Overall Status</h4>
          <span className="status">{health.status}</span>
        </div>
        
        <div className="health-card">
          <h4>MCP Connectivity</h4>
          <span className={`status ${health.mcp_connectivity.connectivity}`}>
            {health.mcp_connectivity.connectivity}
          </span>
        </div>
        
        <div className="health-card">
          <h4>Orchestrator</h4>
          <span className={`status ${health.orchestrator_health.health}`}>
            {health.orchestrator_health.health}
          </span>
        </div>
      </div>
      
      {status.mcp_connection_stats && (
        <div className="stats">
          <h4>📈 Performance Metrics</h4>
          <p>Total Requests: {status.mcp_connection_stats.total_requests}</p>
          <p>Success Rate: {(status.mcp_connection_stats.success_rate * 100).toFixed(1)}%</p>
          <p>Avg Response Time: {status.mcp_connection_stats.average_response_time.toFixed(2)}s</p>
        </div>
      )}
    </div>
  );
};

export default HealthDashboard;
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in your frontend:

```bash
# Frontend configuration
VITE_API_URL=http://localhost:3001
VITE_LANGGRAPH_URL=http://localhost:8000
VITE_ENABLE_LANGGRAPH=true
VITE_ENABLE_HEALTH_DASHBOARD=true
```

## 🎯 Example Query Processing Flow

Here's what happens when a user asks "What has caused some error?":

### 1. **Query Analysis** (LangGraph)
```json
{
  "query_type": "incident_analysis",
  "intent": "root_cause_investigation", 
  "confidence_score": 0.85,
  "specificity_level": "low"
}
```

### 2. **Tool Execution Plan** 
```json
{
  "tool_sequence": [
    "search_logs",
    "get_incidents", 
    "search_changelogs",
    "get_relationships"
  ]
}
```

### 3. **Incident Analysis**
```json
{
  "root_causes": [
    {
      "description": "Database connection pool exhaustion",
      "confidence": 0.92,
      "evidence": ["Change occurred 15 minutes before incident"]
    }
  ]
}
```

### 4. **Response Enrichment**
```json
{
  "forward_links": [
    "Check database connection configuration",
    "Review recent deployments", 
    "Investigate resource utilization"
  ],
  "annotations": [
    "💡 Multiple potential root causes identified",
    "🔍 Comprehensive analysis across 4 data sources"
  ]
}
```

## 🚨 Troubleshooting

### Common Issues

1. **LangGraph not responding**
   ```bash
   # Check if service is running
   curl http://localhost:8000/health
   
   # Check logs
   docker-compose logs langgraph-orchestrator
   ```

2. **MCP integration failing**
   ```bash
   # Test MCP server directly
   curl http://localhost:3001/api/mcp/tools
   
   # Check network connectivity
   docker exec langgraph-orchestrator curl http://mcp-server:3001/api/mcp/tools
   ```

3. **Frontend not showing enhancements**
   ```bash
   # Check environment variables
   echo $VITE_LANGGRAPH_URL
   
   # Test LangGraph from browser console
   fetch('http://localhost:8000/health').then(r => r.json()).then(console.log)
   ```

## 📈 Performance Optimization

### Caching Strategy

Implement caching for frequently accessed data:

```javascript
// Simple in-memory cache for analysis results
const analysisCache = new Map();

const getCachedAnalysis = (query) => {
  const cacheKey = query.toLowerCase().trim();
  return analysisCache.get(cacheKey);
};

const setCachedAnalysis = (query, result) => {
  const cacheKey = query.toLowerCase().trim();
  analysisCache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });
  
  // Clean old entries
  if (analysisCache.size > 100) {
    const oldestKey = analysisCache.keys().next().value;
    analysisCache.delete(oldestKey);
  }
};
```

This integration guide gives you everything needed to implement the LangGraph orchestrator in your MCP chatbot, with fallback mechanisms and enhanced UI components to showcase the intelligent capabilities.