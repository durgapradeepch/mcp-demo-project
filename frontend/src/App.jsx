import { useState, useEffect } from 'react';
import axios from 'axios';

// Results Display Component
function ResultsDisplay({ data, type }) {
  if (!data) return null;

  const renderCharacterTable = (characters) => {
    if (!Array.isArray(characters)) return null;
    
    return (
      <div className="results-table-container">
        <h4 className="results-title">👥 Characters ({characters.length})</h4>
        <div className="results-table">
          <div className="table-header">
            <div className="header-cell">Name</div>
            <div className="header-cell">House</div>
          </div>
          {characters.map((char, index) => (
            <div key={index} className="table-row">
              <div className="table-cell name-cell">{char.name}</div>
              <div className="table-cell house-cell">
                <span className={`house-badge ${char.house === 'Unknown House' ? 'unknown' : 'known'}`}>
                  {char.house}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRelationshipTable = (relationships) => {
    if (!Array.isArray(relationships)) return null;
    
    return (
      <div className="results-table-container">
        <h4 className="results-title">🔗 Relationships ({relationships.length})</h4>
        <div className="results-table">
          <div className="table-header relationships">
            <div className="header-cell">From</div>
            <div className="header-cell">Type</div>
            <div className="header-cell">To</div>
            <div className="header-cell">Weight</div>
          </div>
          {relationships.map((rel, index) => (
            <div key={index} className="table-row relationships">
              <div className="table-cell">{rel.from}</div>
              <div className="table-cell">
                <span className="relationship-type">{rel.relationship}</span>
              </div>
              <div className="table-cell">{rel.to}</div>
              <div className="table-cell">
                <span className="weight-badge">{rel.weight}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStatsCards = (stats) => {
    if (!stats.characters && !stats.relationships && !stats.houses) return null;
    
    return (
      <div className="stats-cards-container">
        <h4 className="results-title">📊 Database Statistics</h4>
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-value">{stats.characters || 0}</div>
              <div className="stat-label">Characters</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔗</div>
            <div className="stat-content">
              <div className="stat-value">{stats.relationships || 0}</div>
              <div className="stat-label">Relationships</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏰</div>
            <div className="stat-content">
              <div className="stat-value">{stats.houses || 0}</div>
              <div className="stat-label">Houses</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCharacterCard = (character) => {
    if (!character.name) return null;
    
    return (
      <div className="character-card">
        <div className="card-header">
          <div className="character-avatar">👤</div>
          <div className="character-info">
            <h4 className="character-name">{character.name}</h4>
            <span className={`house-badge ${character.house === 'Unknown House' ? 'unknown' : 'known'}`}>
              {character.house}
            </span>
          </div>
        </div>
        {character.action && (
          <div className="card-action">
            <span className="action-badge">{character.action}</span>
            {character.timestamp && (
              <span className="timestamp">{new Date(character.timestamp).toLocaleString()}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderGenericData = (data) => {
    if (typeof data === 'object' && data !== null) {
      return (
        <div className="generic-data">
          <h4 className="results-title">📋 Results</h4>
          <div className="data-content">
            <pre className="json-display">{JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      );
    }
    
    return (
      <div className="text-result">
        <p>{String(data)}</p>
      </div>
    );
  };

  // Determine what type of data we have and render accordingly
  if (type === 'characters' || (Array.isArray(data) && data[0]?.name)) {
    return renderCharacterTable(data);
  }
  
  if (type === 'relationships' || (Array.isArray(data) && data[0]?.from)) {
    return renderRelationshipTable(data);
  }
  
  if (type === 'stats' || (data.characters || data.relationships || data.houses)) {
    return renderStatsCards(data);
  }
  
  if (type === 'character' || (data.name && data.house)) {
    return renderCharacterCard(data);
  }
  
  return renderGenericData(data);
}

function App() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dbStats, setDbStats] = useState({ characters: 0, relationships: 0, houses: 0 });
  const [mcpTools, setMcpTools] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [toolsLoaded, setToolsLoaded] = useState(false);
  const [toolsError, setToolsError] = useState(null);


  const API_BASE = 'http://localhost:3001/api';

  // Fetch database stats and MCP tools on component mount
  useEffect(() => {
    console.log('App component mounted, fetching data...');
    fetchDatabaseStats();
    fetchMcpTools();
  }, []);

  const fetchDatabaseStats = async () => {
    try {
      const response = await axios.post(`${API_BASE}/mcp/execute`, {
        tool_name: 'get_database_stats',
        parameters: {}
      });
      setDbStats(response.data.result);
    } catch (error) {
      console.error('Failed to fetch database stats:', error);
    }
  };

  const fetchMcpTools = async () => {
    try {
      console.log('Fetching MCP tools...');
      const response = await axios.get(`${API_BASE}/mcp/tools`);
      console.log('MCP tools response:', response.data);
      setMcpTools(response.data.tools);
      setToolsLoaded(true);
    } catch (error) {
      console.error('Failed to fetch MCP tools:', error);
      console.error('Error details:', error.response?.data);
      setToolsError('Failed to load MCP tools. Please check the server.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMessage = prompt.trim();
    setPrompt('');
    setLoading(true);

    setMessages(prev => [...prev, { type: 'user', content: userMessage, timestamp: new Date() }]);

    try {
      const response = await axios.post(`${API_BASE}/ai-execute`, {
        prompt: userMessage
      });

      setMessages(prev => [...prev, { 
        type: 'ai', 
        content: response.data.message,
        details: response.data.details,
        aiAnalysis: response.data.ai_analysis,
        actionPlan: response.data.action_plan,
        feedback: response.data.feedback || 'Operation completed successfully',
        timestamp: new Date()
      }]);

      // Refresh database stats after successful operation
      if (response.data.details && response.data.details.action) {
        setTimeout(fetchDatabaseStats, 1000);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        type: 'error', 
        content: 'Failed to execute prompt',
        error: error.response?.data?.error || error.message,
        aiAnalysis: error.response?.data?.ai_analysis || null,
        actionPlan: error.response?.data?.action_plan || null,
        feedback: 'Operation failed - please check the error details',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => setMessages([]);

  const executeMcpTool = async (toolName, parameters = {}) => {
    try {
      console.log(`Executing MCP tool: ${toolName} with parameters:`, parameters);
      const response = await axios.post(`${API_BASE}/mcp/execute`, {
        tool_name: toolName,
        parameters
      });
      
      console.log(`MCP tool ${toolName} response:`, response.data);
      
      setMessages(prev => [...prev, {
        type: 'ai',
        content: `Executed ${toolName} successfully`,
        details: response.data.result,
        timestamp: new Date()
      }]);

      // Refresh stats
      setTimeout(fetchDatabaseStats, 500);
    } catch (error) {
      console.error(`Failed to execute ${toolName}:`, error);
      console.error('Error details:', error.response?.data);
      
      setMessages(prev => [...prev, {
        type: 'error',
        content: `Failed to execute ${toolName}`,
        error: error.response?.data?.error || error.message,
        timestamp: new Date()
      }]);
    }
  };

  const quickActions = [
    {
      label: 'View Characters',
      icon: '👥',
      action: () => {
        console.log('Quick action: View Characters clicked');
        executeMcpTool('get_characters', { limit: 20 });
      },
      type: 'primary'
    },
    {
      label: 'View Relationships',
      icon: '🔗',
      action: () => {
        console.log('Quick action: View Relationships clicked');
        executeMcpTool('get_relationships', { limit: 20 });
      },
      type: 'secondary'
    },
    {
      label: 'Add Character',
      icon: '➕',
      action: () => {
        console.log('Quick action: Add Character clicked');
        setPrompt("Add a character named 'New Character' to House Stark");
      },
      type: 'secondary'
    },
    {
      label: 'Create Relationship',
      icon: '🤝',
      action: () => {
        console.log('Quick action: Create Relationship clicked');
        // Execute the create_relationship tool directly
        executeMcpTool('create_relationship', {
          fromCharacter: 'Jon Snow',
          toCharacter: 'Sam Tarly',
          relationshipType: 'FRIENDS',
          weight: 1
        });
      },
      type: 'secondary'
    },
    {
      label: 'Custom Relationship',
      icon: '🔗',
      action: () => {
        console.log('Quick action: Custom Relationship clicked');
        setPrompt("Create a relationship between [Character1] and [Character2] with type [RELATIONSHIP_TYPE]");
      },
      type: 'secondary'
    }
  ];

  return (
    <div className="app">
      <div className="header-section">
        <div className="header-content">
          <div className="brand">
            <div className="brand-icon">🗄️</div>
            <div className="brand-text">
              <h1>Neo4j MCP Hub</h1>
              <p>AI-Powered Database Management</p>
            </div>
          </div>
          <div className="header-actions">

            <button onClick={clearChat} className="clear-chat-btn">
              <span>🗑️</span>
              Clear Chat
            </button>
          </div>
        </div>
      </div>

      <div className="main-container">
        <div className="left-panel">
          <div className="panel-section">
            <h3>🚀 Quick Actions</h3>
            <div className="action-buttons">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className={`action-btn ${action.type}`}
                  onClick={() => {
                    console.log(`Button ${index} clicked: ${action.label}`);
                    action.action();
                  }}
                >
                  <span>{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <h3>📊 Database Stats</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">{dbStats.characters || '∞'}</span>
                <span className="stat-label">Characters</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{dbStats.relationships || '∞'}</span>
                <span className="stat-label">Relationships</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{dbStats.houses || '∞'}</span>
                <span className="stat-label">Houses</span>
              </div>
            </div>
          </div>
        </div>

        <div className="center-panel">
          <div className="chat-window">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-illustration">
                  <div className="floating-element el-1">🗄️</div>
                  <div className="floating-element el-2">🤖</div>
                  <div className="floating-element el-3">⚡</div>
                  <div className="floating-element el-4">🔍</div>
                </div>
                <h2>Ready to Chat?</h2>
                <p>Ask me anything about your Neo4j database</p>
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Try: "Show me all characters in House Stark" or "Create a new character"
                  </p>

                </div>
              </div>
            ) : (
              <div className="messages-list">
                {messages.map((message, index) => (
                  <div key={index} className={`message-item ${message.type}`}>
                    <div className="message-header">
                      <div className="message-avatar">
                        {message.type === 'user' ? '👤' : message.type === 'error' ? '⚠️' : '🤖'}
                      </div>
                      <div className="message-meta">
                        <span className="message-sender">
                          {message.type === 'user' ? 'You' : message.type === 'error' ? 'Error' : 'AI Assistant'}

                        </span>
                        <span className="message-time">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="message-content">
                      {message.content}
                    </div>
                    
                    {message.feedback && (
                      <div className="feedback-section">
                        <div className="feedback-header">
                          <span className="feedback-icon">💬</span>
                          Feedback
                        </div>
                        <div className="feedback-content">
                          {message.feedback}
                        </div>
                      </div>
                    )}
                    
                    {/* Enhanced Results Display */}
                    {message.details && (
                      <div className="message-details">
                        <details className="detail-section" open>
                          <summary className="detail-header">
                            <span className="detail-icon">📊</span>
                            Results
                          </summary>
                          <div className="detail-content">
                            <ResultsDisplay 
                              data={message.details.characters || message.details.relationships || message.details} 
                              type={message.details.characters ? 'characters' : 
                                    message.details.relationships ? 'relationships' : 
                                    message.details.action ? 'character' : 
                                    Array.isArray(message.details) && message.details.length > 0 ? 
                                    (message.details[0].name ? 'characters' : 
                                     message.details[0].from ? 'relationships' : 'generic') : 'generic'}
                            />
                          </div>
                        </details>
                      </div>
                    )}
                    
                    {message.type === 'ai' && message.aiAnalysis && (
                      <div className="message-details">
                        <details className="detail-section">
                          <summary className="detail-header">
                            <span className="detail-icon">🧠</span>
                            AI Analysis
                          </summary>
                          <div className="detail-content">
                            <pre>{message.aiAnalysis}</pre>
                          </div>
                        </details>
                      </div>
                    )}
                    
                    {message.type === 'ai' && message.actionPlan && (
                      <div className="message-details">
                        <details className="detail-section">
                          <summary className="detail-header">
                            <span className="detail-icon">📋</span>
                            Action Plan
                          </summary>
                          <div className="detail-content">
                            <div className="plan-details">
                              <div className="plan-row">
                                <strong>Action:</strong> {message.actionPlan.action}
                              </div>
                              <div className="plan-row">
                                <strong>Reasoning:</strong> {message.actionPlan.reasoning}
                              </div>
                              <div className="plan-row">
                                <strong>Plan:</strong> {message.actionPlan.execution_plan}
                              </div>
                            </div>
                          </div>
                        </details>
                      </div>
                    )}
                    
                    {message.type === 'error' && message.error && (
                      <div className="message-details">
                        <details className="detail-section">
                          <summary className="detail-header">
                            <span className="detail-icon">⚠️</span>
                            Error Details
                          </summary>
                          <div className="detail-content">
                            <pre>{message.error}</pre>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
                
                {loading && (
                  <div className="message-item ai loading">
                    <div className="message-header">
                      <div className="message-avatar">🤖</div>
                      <div className="message-meta">
                        <span className="message-sender">AI Assistant</span>
                        <span className="message-time">Processing...</span>
                      </div>
                    </div>
                    <div className="message-content">
                      <div className="processing-indicator">
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="input-area">
            <form onSubmit={handleSubmit} className="input-form">
              <div className="input-container">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Type your message here... (e.g., 'Show me all characters in House Stark')"
                  disabled={loading}
                  className="message-input"
                />
                <button 
                  type="submit" 
                  className="send-btn"
                  disabled={loading || !prompt.trim()}
                >
                  {loading ? (
                    <div className="btn-spinner"></div>
                  ) : (
                    <span>Send</span>
                  )}
                </button>
              </div>
            </form>
            <div className="input-help">
              Press Enter to send • Use natural language to interact with your database
            </div>
          </div>
        </div>

        <div className="right-panel">
          <div className="panel-section">
            <h3>🔧 MCP Tools</h3>
            {toolsError ? (
              <div className="error-message">
                <p>❌ {toolsError}</p>
                <button onClick={fetchMcpTools} className="retry-btn">Retry</button>
              </div>
            ) : !toolsLoaded ? (
              <div className="loading-message">
                <p>⏳ Loading MCP tools...</p>
              </div>
            ) : (
              <div className="mcp-tools-list">
                {mcpTools.map((tool, index) => (
                  <div key={index} className="mcp-tool-item">
                    <div className="tool-header">
                      <span className="tool-name">{tool.name}</span>
                      <span className="tool-type">MCP Tool</span>
                    </div>
                    <p className="tool-description">{tool.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel-section">
            <h3>📈 Recent Activity</h3>
            <div className="recent-list">
              <div className="recent-item">
                <span className="recent-icon">✅</span>
                <span>Database connected</span>
              </div>
              <div className="recent-item">
                <span className="recent-icon">📥</span>
                <span>Data imported</span>
              </div>
              <div className="recent-item">
                <span className="recent-icon">🤖</span>
                <span>AI ready</span>
              </div>
              <div className="recent-item">
                <span className="recent-icon">⚡</span>
                <span>MCP tools loaded</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
