"""
Configuration management for LangGraph Orchestrator
"""

import os
from typing import Dict, Any
from dataclasses import dataclass

@dataclass
class OrchestrationConfig:
    """Configuration for orchestration behavior"""
    max_retries: int = 3
    retry_delay: float = 1.0
    timeout_per_stage: float = 60.0
    max_parallel_tools: int = 3
    quality_threshold: float = 0.6
    max_error_count: int = 3

@dataclass
class MCPClientConfig:
    """Configuration for MCP client"""
    server_url: str = "http://localhost:3001"
    timeout: float = 30.0
    max_retries: int = 3
    retry_delay: float = 1.0

@dataclass
class ServerConfig:
    """Configuration for FastAPI server"""
    host: str = "0.0.0.0" 
    port: int = 8000
    log_level: str = "info"
    reload: bool = False

class Config:
    """Main configuration class"""
    
    def __init__(self):
        self.orchestration = OrchestrationConfig()
        self.mcp_client = MCPClientConfig()
        self.server = ServerConfig()
        
        # Load from environment variables
        self._load_from_env()
    
    def _load_from_env(self):
        """Load configuration from environment variables"""
        
        # MCP Client configuration
        self.mcp_client.server_url = os.getenv("MCP_SERVER_URL", self.mcp_client.server_url)
        self.mcp_client.timeout = float(os.getenv("MCP_CLIENT_TIMEOUT", self.mcp_client.timeout))
        
        # Server configuration
        self.server.host = os.getenv("LANGGRAPH_HOST", self.server.host)
        self.server.port = int(os.getenv("LANGGRAPH_PORT", self.server.port))
        self.server.log_level = os.getenv("LOG_LEVEL", self.server.log_level)
        
        # Orchestration configuration
        self.orchestration.max_retries = int(os.getenv("MAX_RETRIES", self.orchestration.max_retries))
        self.orchestration.timeout_per_stage = float(os.getenv("STAGE_TIMEOUT", self.orchestration.timeout_per_stage))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        return {
            "orchestration": {
                "max_retries": self.orchestration.max_retries,
                "retry_delay": self.orchestration.retry_delay,
                "timeout_per_stage": self.orchestration.timeout_per_stage,
                "max_parallel_tools": self.orchestration.max_parallel_tools,
                "quality_threshold": self.orchestration.quality_threshold,
                "max_error_count": self.orchestration.max_error_count
            },
            "mcp_client": {
                "server_url": self.mcp_client.server_url,
                "timeout": self.mcp_client.timeout,
                "max_retries": self.mcp_client.max_retries,
                "retry_delay": self.mcp_client.retry_delay
            },
            "server": {
                "host": self.server.host,
                "port": self.server.port,
                "log_level": self.server.log_level,
                "reload": self.server.reload
            }
        }

# Global config instance
config = Config()

# Environment file template
ENV_TEMPLATE = """
# LangGraph Orchestrator Configuration

# MCP Server Configuration
MCP_SERVER_URL=http://localhost:3001
MCP_CLIENT_TIMEOUT=30.0

# LangGraph Server Configuration  
LANGGRAPH_HOST=0.0.0.0
LANGGRAPH_PORT=8000
LOG_LEVEL=info

# Orchestration Configuration
MAX_RETRIES=3
STAGE_TIMEOUT=60.0

# Development Settings
DEVELOPMENT=false
DEBUG_MODE=false
"""