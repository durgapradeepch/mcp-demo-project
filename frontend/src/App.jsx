import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css'; // Import the stylesheet

// ============================================================================
//  LOG COMPONENTS
// ============================================================================

/**
 * Individual Log Entry with expandable JSON details
 */
function LogEntry({ log, index }) {
    const [expanded, setExpanded] = useState(false);

    // Extract key fields from log
    const timestamp = log._time || log.timestamp || new Date().toISOString();
    const message = log._msg || log.message || 'No message';
    const level = log.level || log.severity || 'INFO';
    const object = log.object || log.source || 'N/A';

    return (
        <div className="log-entry-item" onClick={() => setExpanded(!expanded)}>
            <div className="log-entry-summary">
                <span className="log-time">{new Date(timestamp).toLocaleString()}</span>
                <span className="log-level">{level}</span>
                <span className="log-message">{message.substring(0, 100)}{message.length > 100 ? '...' : ''}</span>
                <span className="log-object">{object}</span>
                <span className="expand-arrow">{expanded ? '▼' : '▶'}</span>
            </div>

            {expanded && (
                <div className="log-entry-details">
                    <h5>🔍 Raw Log Data</h5>
                    <pre>{JSON.stringify(log, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}

// ============================================================================
//  HELPER COMPONENTS
// ============================================================================

/**
 * A collapsible section similar to Streamlit's expander.
 */
function CollapsibleSection({ title, icon, children, defaultExpanded = false }) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className="collapsible-section">
            <button className="collapsible-header" onClick={() => setIsExpanded(!isExpanded)}>
                <span className="collapsible-title">
                    <span className="collapsible-icon">{icon}</span>
                    {title}
                </span>
                <span className="collapsible-arrow">{isExpanded ? '−' : '+'}</span>
            </button>
            {isExpanded && <div className="collapsible-content">{children}</div>}
        </div>
    );
}

/**
 * Displays results dynamically based on the data structure.
 */
function ResultsDisplay({ data }) {
    if (!data) return null;

    // --- RENDER FUNCTIONS ---

    const renderLogs = (logData) => {
        const logs = logData.logs || [];
        const count = logData.count || logs.length;

        return (
            <div className="results-container">
                <h4>📋 Logs ({count})</h4>
                <p style={{ marginBottom: '1rem', color: '#666' }}>
                    Click on any log entry to view its raw JSON data
                </p>
                <div className="log-entries-container">
                    {logs.slice(0, 50).map((log, index) => (
                        <LogEntry key={index} log={log} index={index} />
                    ))}
                </div>
            </div>
        );
    };

    const renderCharacterTable = (characters) => (
        <div className="results-container">
            <h4>👥 Characters ({characters.length})</h4>
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr><th>Name</th><th>House</th></tr>
                    </thead>
                    <tbody>
                        {characters.map((char, i) => (
                            <tr key={i}>
                                <td>{char.name}</td>
                                <td>{char.house !== "Unknown House" ? '✅' : '❓'} {char.house}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderRelationshipTable = (relationships) => (
        <div className="results-container">
            <h4>🔗 Relationships ({relationships.length})</h4>
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr><th>From</th><th>Type</th><th>To</th><th>Weight</th></tr>
                    </thead>
                    <tbody>
                        {relationships.map((rel, i) => (
                            <tr key={i}>
                                <td>{rel.from}</td>
                                <td>🤝 {rel.relationship}</td>
                                <td>{rel.to}</td>
                                <td>⚖️ {rel.weight}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderStatsCards = (stats) => (
        <div className="results-container">
            <h4>📊 Database Statistics</h4>
            <div className="stats-cards-container">
                <div className="stat-card">
                    <span className="stat-label">👥 Characters</span>
                    <span className="stat-value">{stats.characters || 0}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">🔗 Relationships</span>
                    <span className="stat-value">{stats.relationships || 0}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">🏰 Houses</span>
                    <span className="stat-value">{stats.houses || 0}</span>
                </div>
            </div>
        </div>
    );

    const renderGenericData = (genericData) => (
        <div className="results-container">
            <h4>📋 Results</h4>
            <pre>{JSON.stringify(genericData, null, 2)}</pre>
        </div>
    );

    // --- LOGIC TO DETERMINE RENDERER ---

    if (data.logs && Array.isArray(data.logs)) return renderLogs(data);
    if (Array.isArray(data) && data.length > 0 && (data[0]._msg || data[0].message)) return renderLogs({ logs: data });
    if (Array.isArray(data) && data.length > 0 && data[0].name) return renderCharacterTable(data);
    if (Array.isArray(data) && data.length > 0 && data[0].from) return renderRelationshipTable(data);
    if (data.characters || data.relationships || data.houses) return renderStatsCards(data);

    return renderGenericData(data);
}


// ============================================================================
//  MAIN APP COMPONENT
// ============================================================================

function App() {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState(() => {
        // Try to get existing session from localStorage, or create new one
        const stored = localStorage.getItem('chat_session_id');
        if (stored) return stored;
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('chat_session_id', newSessionId);
        return newSessionId;
    });
    const chatEndRef = useRef(null);

    // Use LangGraph Orchestrator instead of direct MCP server
    const LANGGRAPH_API = 'http://localhost:8000';

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!prompt.trim() || loading) return;

        const userMessage = { role: 'user', content: prompt.trim(), timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        setPrompt('');
        setLoading(true);

        try {
            // Call LangGraph orchestrator with session_id for memory persistence
            const response = await axios.post(`${LANGGRAPH_API}/chat`, {
                user_query: userMessage.content,
                session_id: sessionId
            });

            const aiMessage = {
                role: 'ai',
                content: response.data.response || 'No response generated',
                details: response.data.execution_summary,
                aiAnalysis: response.data.query_analysis,
                enrichment: response.data.enrichment,
                incidentAnalysis: response.data.incident_analysis,
                sessionInfo: response.data.session_info,
                executedTools: response.data.executed_tools,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            const errorMessage = {
                role: 'error',
                content: 'Failed to execute prompt',
                error: error.response?.data?.error || error.message,
                feedback: 'Operation failed - please check the error details',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([]);
        // Generate new session ID when clearing chat
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(newSessionId);
        localStorage.setItem('chat_session_id', newSessionId);
    };

    return (
        <div className="app-layout">
            <header className="app-header">
                <div className="header-title">
                    <h1>🗄️ MCP Hub</h1>
                    <p>AI-Powered Database Management</p>
                </div>
                <button onClick={clearChat} className="clear-chat-btn">🗑️ Clear Chat</button>
            </header>

            <main className="chat-container">
                <div className="chat-window">
                    {messages.length === 0 ? (
                        <div className="empty-state">
                            <h2>🤖 LangGraph Orchestrator</h2>
                            <p>Multi-agent AI system powered by LangGraph</p>
                            <span>Try: "How many nodes are there in neo4j?" or "Show me recent incidents"</span>
                        </div>
                    ) : (
                        messages.map((msg, index) => (
                            <div key={index} className={`chat-bubble-wrapper ${msg.role}`}>
                                <div className="chat-bubble">
                                    <div className="message-content">{msg.content}</div>

                                    {msg.role === 'ai' && msg.enrichment && (
                                        <CollapsibleSection title="🎯 LangGraph Enrichment" icon="✨" defaultExpanded>
                                            <div className="enrichment-content">
                                                {msg.enrichment.forward_links && msg.enrichment.forward_links.length > 0 && (
                                                    <div className="forward-links">
                                                        <strong>💡 Suggested Next Steps:</strong>
                                                        <ul>
                                                            {msg.enrichment.forward_links.map((link, i) => (
                                                                <li key={i}>{link}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {msg.enrichment.annotations && msg.enrichment.annotations.length > 0 && (
                                                    <div className="annotations">
                                                        <strong>📝 Annotations:</strong>
                                                        <ul>
                                                            {msg.enrichment.annotations.map((note, i) => (
                                                                <li key={i}>{note}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </CollapsibleSection>
                                    )}

                                    {msg.details && (
                                        <CollapsibleSection title="📊 Execution Summary" icon="🔍">
                                            <div className="execution-summary">
                                                <p><strong>Tools Executed:</strong> {msg.details.tools_executed} / {msg.details.tools_planned}</p>
                                                <p><strong>Success Rate:</strong> {(msg.details.success_rate * 100).toFixed(1)}%</p>
                                                <p><strong>Investigation Depth:</strong> {msg.details.investigation_depth}</p>
                                            </div>
                                        </CollapsibleSection>
                                    )}

                                    {msg.aiAnalysis && (
                                        <CollapsibleSection title="🧠 Query Analysis" icon="�">
                                            <div className="query-analysis">
                                                <p><strong>Type:</strong> {msg.aiAnalysis.query_type}</p>
                                                <p><strong>Intent:</strong> {msg.aiAnalysis.intent}</p>
                                                <p><strong>Confidence:</strong> {(msg.aiAnalysis.confidence_score * 100).toFixed(0)}%</p>
                                            </div>
                                        </CollapsibleSection>
                                    )}

                                    {msg.incidentAnalysis && (
                                        <CollapsibleSection title="🚨 Incident Analysis" icon="⚠️">
                                            <pre>{JSON.stringify(msg.incidentAnalysis, null, 2)}</pre>
                                        </CollapsibleSection>
                                    )}

                                    {msg.executedTools && msg.executedTools.length > 0 && (
                                        <CollapsibleSection title="🛠️ Tool Execution Logs" icon="⚙️">
                                            <div className="tool-execution-logs">
                                                {msg.executedTools.map((tool, i) => (
                                                    <div key={i} className="tool-log-entry">
                                                        <div className="tool-log-header">
                                                            <span className="tool-name">{tool.tool_name}</span>
                                                            <span className={`tool-status ${tool.success ? 'success' : 'failure'}`}>
                                                                {tool.success ? '✅' : '❌'}
                                                            </span>
                                                        </div>
                                                        <div className="tool-log-details">
                                                            <div className="tool-result">
                                                                <strong>Result:</strong>
                                                                <pre>{JSON.stringify(tool.result, null, 2)}</pre>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CollapsibleSection>
                                    )}

                                    {msg.role === 'error' && msg.error && (
                                        <CollapsibleSection title="Error Details" icon="⚠️">
                                            <pre className="error-text">{msg.error}</pre>
                                        </CollapsibleSection>
                                    )}

                                    <div className="timestamp">
                                        {msg.timestamp.toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    {loading && (
                        <div className="chat-bubble-wrapper ai">
                            <div className="chat-bubble">
                                <div className="typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            </main>

            <footer className="input-area">
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Type your message here..."
                        disabled={loading}
                    />
                </form>
            </footer>
        </div>
    );
}

export default App;