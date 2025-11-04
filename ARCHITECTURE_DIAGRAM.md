# MCP Demo Project - LLM-Driven Architecture

## High-Level System Architecture

```mermaid
graph TB
    subgraph "User Interface Layer"
        UI[React Frontend<br/>Port 5173<br/>User Queries & Responses]
    end

    subgraph "Orchestration Layer - LangGraph"
        LG[LangGraph Orchestrator<br/>Port 8000<br/>FastAPI Server]
        
        subgraph "LLM Decision Engine"
            LLM[LLMDecisionMaker<br/>OpenAI GPT-4<br/>Central Intelligence]
        end
        
        subgraph "Workflow State Machine"
            WF[StateGraph Workflow<br/>- orchestrator_start<br/>- query_analysis<br/>- tool_planning<br/>- tool_execution<br/>- incident_analysis<br/>- response_enrichment<br/>- orchestrator_finish]
        end
        
        subgraph "Specialized Agents"
            QA[QueryAnalysisAgent<br/>LLM-powered intent detection]
            TE[ToolExecutionAgent<br/>MCP tool coordination]
            IA[IncidentAnalysisAgent<br/>LLM correlation analysis]
            RE[ResponseEnrichmentAgent<br/>LLM response generation]
            OR[OrchestratorAgent<br/>Workflow coordination]
        end
    end

    subgraph "Data Layer - MCP Server"
        MCP[Node.js MCP Server<br/>Port 3001<br/>43 Available Tools]
        
        subgraph "MCP Tools Categories"
            DB_TOOLS[Database Tools<br/>- get_schema<br/>- query_nodes<br/>- get_database_stats]
            INC_TOOLS[Incident Tools<br/>- get_incidents<br/>- search_incidents<br/>- get_incident_by_id]
            LOG_TOOLS[Logging Tools<br/>- search_logs<br/>- query_logs<br/>- get_log_entries]
            RES_TOOLS[Resource Tools<br/>- get_resources<br/>- get_resource_by_id<br/>- check_resource_health]
        end
    end

    subgraph "Storage Layer"
        NEO4J[Neo4j Database<br/>Port 7474/7687<br/>Graph Data Storage]
        CSV_DATA[CSV Data Files<br/>- nodes.csv<br/>- relationships.csv]
    end

    subgraph "External Services"
        OPENAI[OpenAI API<br/>GPT-4 Model<br/>Decision Making]
    end

    %% User Flow
    UI -->|HTTP Requests| LG
    LG -->|Responses| UI

    %% LangGraph Internal Flow
    LG --> WF
    WF --> QA
    WF --> TE
    WF --> IA
    WF --> RE
    WF --> OR

    %% LLM Integration
    LLM -->|Query Analysis| QA
    LLM -->|Tool Planning| WF
    LLM -->|Routing Decisions| WF
    LLM -->|Incident Analysis| IA
    LLM -->|Response Generation| RE

    %% Data Access Flow
    TE -->|Tool Execution| MCP
    MCP --> DB_TOOLS
    MCP --> INC_TOOLS
    MCP --> LOG_TOOLS
    MCP --> RES_TOOLS

    %% Storage Access
    MCP -->|Cypher Queries| NEO4J
    NEO4J -->|Graph Data| MCP

    %% External API Calls
    LLM -.->|API Calls| OPENAI

    %% Data Loading
    CSV_DATA -->|Initial Load| NEO4J

    %% Styling
    classDef frontend fill:#e1f5fe
    classDef orchestration fill:#f3e5f5
    classDef llm fill:#fff3e0
    classDef agents fill:#e8f5e8
    classDef mcp fill:#fce4ec
    classDef storage fill:#f1f8e9
    classDef external fill:#fff8e1

    class UI frontend
    class LG,WF orchestration
    class LLM llm
    class QA,TE,IA,RE,OR agents
    class MCP,DB_TOOLS,INC_TOOLS,LOG_TOOLS,RES_TOOLS mcp
    class NEO4J,CSV_DATA storage
    class OPENAI external
```

## Detailed Component Flow

### 1. Request Processing Flow

```mermaid
sequenceDiagram
    participant User as User Interface
    participant LG as LangGraph Orchestrator
    participant LLM as LLM Decision Maker
    participant QA as Query Analysis Agent
    participant WF as Workflow Engine
    participant TE as Tool Execution Agent
    participant MCP as MCP Server
    participant NEO4J as Neo4j Database
    participant IA as Incident Analysis Agent
    participant RE as Response Enrichment Agent

    User->>LG: Submit Query
    LG->>WF: Initialize Workflow
    WF->>QA: Analyze Query
    QA->>LLM: Get Query Intent & Strategy
    LLM-->>QA: Analysis Results
    QA-->>WF: Query Analysis Complete
    
    WF->>LLM: Plan Tool Sequence
    LLM-->>WF: Tool Execution Plan
    
    WF->>TE: Execute Tools
    TE->>MCP: Call Selected Tools
    MCP->>NEO4J: Execute Queries
    NEO4J-->>MCP: Return Data
    MCP-->>TE: Tool Results
    TE-->>WF: Execution Complete
    
    WF->>LLM: Make Routing Decision
    LLM-->>WF: Route to Incident Analysis
    
    WF->>IA: Analyze Incidents
    IA->>LLM: Correlate Data & Find Root Causes
    LLM-->>IA: Analysis Results
    IA-->>WF: Incident Analysis Complete
    
    WF->>RE: Enrich Response
    RE->>LLM: Generate Final Response
    LLM-->>RE: Enriched Response
    RE-->>WF: Response Ready
    
    WF-->>LG: Workflow Complete
    LG-->>User: Final Response
```

## Key Architecture Principles

### 🤖 LLM-First Decision Making
- **Central Intelligence**: All decision points use OpenAI GPT-4 for dynamic reasoning
- **No Hardcoded Logic**: Replaced all if/else chains with LLM analysis
- **Context-Aware**: LLM receives full context including available tools, query history, and results

### 🔄 State-Driven Orchestration
- **LangGraph StateGraph**: Manages complex workflow state transitions
- **Memory Persistence**: MemorySaver maintains conversation context
- **Error Recovery**: Robust error handling with fallback mechanisms

### 🛠️ Tool-Agnostic Execution
- **MCP Protocol**: 43 specialized tools for data access and manipulation
- **Dynamic Selection**: LLM chooses optimal tools based on query requirements
- **Parallel Execution**: Support for concurrent tool execution when appropriate

### 📊 Graph Database Integration
- **Neo4j Backend**: Rich graph relationships for complex data queries
- **Cypher Query Language**: Powerful graph traversal and pattern matching
- **CSV Import Pipeline**: Structured data loading from external sources

## System Capabilities

### 🔍 Intelligent Query Analysis
- **Intent Detection**: LLM identifies user goals and required information
- **Entity Extraction**: Automatic identification of resources, incidents, timestamps
- **Strategy Planning**: Dynamic investigation approach based on query complexity

### 🚨 Advanced Incident Analysis
- **Root Cause Investigation**: LLM correlates logs, changes, and incidents
- **Timeline Reconstruction**: Chronological event analysis
- **Impact Assessment**: Severity and scope evaluation with recommendations

### 📈 Adaptive Response Generation
- **Context-Rich Responses**: Incorporates insights from multiple data sources
- **Forward Links**: Suggests next actions and related investigations
- **Confidence Scoring**: Transparent uncertainty communication

### 🔧 Operational Excellence
- **Health Monitoring**: Comprehensive service health checks
- **Performance Metrics**: Tool execution success rates and timing
- **Scalable Architecture**: Docker containerization for easy deployment

## Technology Stack

### Frontend Layer
- **React 18**: Modern component-based UI
- **Vite**: Fast development and build tooling
- **CSS3**: Responsive styling

### Orchestration Layer
- **Python 3.11+**: Core runtime environment
- **LangGraph 0.2.14+**: State machine orchestration
- **FastAPI**: High-performance async web framework
- **OpenAI API**: GPT-4 integration for intelligence

### Data Layer
- **Node.js**: MCP server runtime
- **Neo4j 5.x**: Graph database engine
- **CSV Processing**: Structured data import

### Infrastructure
- **Docker Compose**: Multi-service orchestration
- **Health Checks**: Service availability monitoring
- **Port Management**: Clean service separation

## Deployment Architecture

```mermaid
graph LR
    subgraph "Development Environment"
        DEV[Local Development<br/>Docker Compose<br/>All Services Local]
    end
    
    subgraph "Production Environment"
        LB[Load Balancer<br/>nginx/HAProxy]
        
        subgraph "Application Tier"
            LG1[LangGraph Instance 1]
            LG2[LangGraph Instance N]
        end
        
        subgraph "Data Tier"
            MCP_PROD[MCP Server Cluster]
            NEO_PROD[Neo4j Cluster<br/>High Availability]
        end
        
        subgraph "External Services"
            OPENAI_PROD[OpenAI API<br/>Rate Limited]
            MONITORING[Monitoring Stack<br/>Prometheus/Grafana]
        end
    end
    
    DEV -->|Deploy| LB
    LB --> LG1
    LB --> LG2
    LG1 --> MCP_PROD
    LG2 --> MCP_PROD
    MCP_PROD --> NEO_PROD
    LG1 -.-> OPENAI_PROD
    LG2 -.-> OPENAI_PROD
    LG1 --> MONITORING
    LG2 --> MONITORING
```

## Future Enhancements

### 🔮 Advanced AI Capabilities
- **Multi-Model Support**: Integration with Claude, Gemini, and local models
- **Specialized Fine-Tuning**: Domain-specific model training
- **Agentic Workflows**: Self-improving investigation strategies

### 📡 Enhanced Integrations
- **Real-Time Streaming**: Live data feeds and continuous monitoring
- **External APIs**: Integration with ITSM, monitoring, and alerting systems
- **Webhook Support**: Event-driven automation triggers

### 🔐 Security & Compliance
- **Authentication**: OAuth2/SAML integration
- **Authorization**: Role-based access control (RBAC)
- **Audit Logging**: Comprehensive activity tracking
- **Data Encryption**: End-to-end security

This architecture represents a state-of-the-art LLM-driven chatbot system that combines the power of large language models with structured data access, intelligent workflow orchestration, and comprehensive incident analysis capabilities.