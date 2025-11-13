"""
FastAPI Server - Main entry point for the LangGraph orchestrator
Exposes REST API endpoints for the MCP server to communicate with
"""

import logging
import asyncio
import os
from datetime import datetime
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
import uvicorn

from workflow import LangGraphWorkflow
from utils.mcp_client import MCPClientManager, test_mcp_connectivity, validate_tool_availability
from orchestrator import OrchestratorAgent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import the enhanced workflow for multi-query capabilities
try:
    from enhanced_workflow import EnhancedLangGraphWorkflow
    ENHANCED_AVAILABLE = True
    logger.info("Enhanced multi-query workflow available")
except ImportError:
    logger.warning("Enhanced workflow not available - using standard workflow only")
    ENHANCED_AVAILABLE = False

# Global instances
workflow_instance: Optional[LangGraphWorkflow] = None
enhanced_workflow_instance = None  # Will be EnhancedLangGraphWorkflow if available
mcp_client_manager: Optional[MCPClientManager] = None
orchestrator: Optional[OrchestratorAgent] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global workflow_instance, mcp_client_manager, orchestrator
    
    logger.info("🚀 Starting LangGraph Orchestrator Server")
    
    try:
        # Get MCP server URL from environment
        mcp_server_url = os.getenv("MCP_SERVER_URL", "http://localhost:3001")
        logger.info(f"🔗 Connecting to MCP server at: {mcp_server_url}")
        
        # Initialize MCP client manager
        mcp_client_manager = MCPClientManager(mcp_server_url=mcp_server_url)
        
        # Test MCP server connectivity
        logger.info("🔗 Testing MCP server connectivity...")
        connectivity_test = await test_mcp_connectivity(server_url=mcp_server_url)
        
        if connectivity_test["connectivity"] != "successful":
            logger.error(f"❌ MCP server connectivity failed: {connectivity_test.get('error')}")
            raise Exception("MCP server is not available")
        
        logger.info(f"✅ MCP server connected - {connectivity_test['available_tools']} tools available")
        
        # Initialize standard workflow
        workflow_instance = LangGraphWorkflow(mcp_client_manager)
        
        # Initialize enhanced workflow if available
        global enhanced_workflow_instance
        if ENHANCED_AVAILABLE:
            enhanced_workflow_instance = EnhancedLangGraphWorkflow(mcp_client_manager)
            logger.info("✅ Enhanced multi-query workflow initialized")
        
        orchestrator = OrchestratorAgent()
        
        logger.info("✅ LangGraph Orchestrator initialized successfully")
        
        yield
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize LangGraph Orchestrator: {str(e)}")
        raise
    
    finally:
        logger.info("🛑 Shutting down LangGraph Orchestrator")
        if mcp_client_manager:
            await mcp_client_manager.cleanup_all_sessions()

# Create FastAPI app
app = FastAPI(
    title="LangGraph MCP Orchestrator",
    description="Intelligent orchestration system for MCP chatbot with state management and agent coordination",
    version="1.0.0",
    lifespan=lifespan
)

# Request/Response Models

class ChatRequest(BaseModel):
    """Request model for chat processing"""
    user_query: str = Field(..., description="User's query to process")
    session_id: Optional[str] = Field(None, description="Session ID for conversation continuity")
    
    class Config:
        schema_extra = {
            "example": {
                "user_query": "What has caused some error in the system?",
                "session_id": "user_session_123"
            }
        }

class ChatResponse(BaseModel):
    """Response model for chat processing"""
    success: bool
    response: str
    query_analysis: Dict[str, Any]
    execution_summary: Dict[str, Any]
    enrichment: Dict[str, Any]
    session_info: Dict[str, Any]
    incident_analysis: Optional[Dict[str, Any]] = None

class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str
    timestamp: str
    orchestrator_health: Dict[str, Any]
    mcp_connectivity: Dict[str, Any]
    workflow_status: Dict[str, Any]

class ToolValidationResponse(BaseModel):
    """Response model for tool validation"""
    validation: str
    required_tools: list[str]
    available_tools: list[str] 
    missing_tools: list[str]

# API Endpoints

@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint"""
    return {
        "service": "LangGraph MCP Orchestrator",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "chat": "/chat",
            "chat_enhanced": "/chat/enhanced",
            "health": "/health",
            "status": "/status",
            "validate": "/validate-tools"
        }
    }

@app.post("/chat", response_model=ChatResponse)
async def process_chat(request: ChatRequest, background_tasks: BackgroundTasks):
    """
    Main chat processing endpoint
    Processes user queries through the complete LangGraph workflow
    """
    try:
        logger.info(f"📥 Processing chat request: '{request.user_query}' (session: {request.session_id})")
        
        if not workflow_instance:
            raise HTTPException(status_code=503, detail="Workflow not initialized")
        
        # Process through workflow
        result = await workflow_instance.process_query(
            user_query=request.user_query,
            session_id=request.session_id
        )
        
        # Schedule cleanup in background
        if request.session_id and mcp_client_manager:
            background_tasks.add_task(
                mcp_client_manager.cleanup_session,
                request.session_id
            )
        
        logger.info(f"✅ Chat processing completed successfully")
        
        return ChatResponse(**result)
        
    except Exception as e:
        logger.error(f"❌ Chat processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

@app.post("/chat/enhanced", response_model=ChatResponse)
async def process_enhanced_chat(request: ChatRequest, background_tasks: BackgroundTasks):
    """
    Enhanced chat processing endpoint for multi-part queries
    Uses the enhanced workflow that can handle complex, multi-question prompts
    """
    try:
        logger.info(f"📥 Processing enhanced chat request: '{request.user_query}' (session: {request.session_id})")
        
        if not ENHANCED_AVAILABLE or not enhanced_workflow_instance:
            # Fall back to standard workflow
            logger.warning("Enhanced workflow not available, using standard workflow")
            if not workflow_instance:
                raise HTTPException(status_code=503, detail="No workflow available")
            
            result = await workflow_instance.process_query(
                user_query=request.user_query,
                session_id=request.session_id
            )
        else:
            # Use enhanced workflow
            result = await enhanced_workflow_instance.process_query(
                user_query=request.user_query,
                session_id=request.session_id
            )
        
        # Schedule cleanup in background
        if request.session_id and mcp_client_manager:
            background_tasks.add_task(
                mcp_client_manager.cleanup_session,
                request.session_id
            )
        
        logger.info(f"✅ Enhanced chat processing completed successfully")
        
        return ChatResponse(**result)
        
    except Exception as e:
        logger.error(f"❌ Enhanced chat processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Enhanced chat processing failed: {str(e)}")

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Comprehensive health check endpoint
    """
    try:
        timestamp = datetime.now().isoformat()
        
        # Check orchestrator health
        orchestrator_health = {"status": "unknown"}
        if orchestrator:
            orchestrator_health = orchestrator.get_orchestrator_status()
        
        # Check MCP connectivity - use configured MCP server URL
        mcp_server_url = os.getenv("MCP_SERVER_URL", "http://localhost:3001")
        mcp_connectivity = await test_mcp_connectivity(server_url=mcp_server_url)
        
        # Check workflow status
        workflow_status = {"status": "unknown"}
        if workflow_instance:
            workflow_status = workflow_instance.get_workflow_status()
        
        # Determine overall status
        overall_status = "healthy"
        if (mcp_connectivity.get("connectivity") != "successful" or 
            orchestrator_health.get("health") == "degraded"):
            overall_status = "degraded"
        
        return HealthResponse(
            status=overall_status,
            timestamp=timestamp,
            orchestrator_health=orchestrator_health,
            mcp_connectivity=mcp_connectivity,
            workflow_status=workflow_status
        )
        
    except Exception as e:
        logger.error(f"❌ Health check failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@app.get("/status", response_model=Dict[str, Any])
async def get_status():
    """
    Get detailed system status and metrics
    """
    try:
        status = {
            "service": "LangGraph MCP Orchestrator",
            "timestamp": datetime.now().isoformat(),
            "uptime": "running",  # Could calculate actual uptime
        }
        
        # Add orchestrator metrics
        if orchestrator:
            status["orchestrator_metrics"] = orchestrator.get_orchestrator_status()
        
        # Add MCP connection stats  
        if mcp_client_manager:
            status["mcp_connection_stats"] = mcp_client_manager.get_connection_stats()
        
        # Add workflow status
        if workflow_instance:
            status["workflow_info"] = workflow_instance.get_workflow_status()
        
        return status
        
    except Exception as e:
        logger.error(f"❌ Status check failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@app.post("/validate-tools", response_model=ToolValidationResponse)
async def validate_tools(required_tools: list[str]):
    """
    Validate that required MCP tools are available
    """
    try:
        logger.info(f"🔍 Validating {len(required_tools)} required tools")
        
        validation_result = await validate_tool_availability(required_tools)
        
        return ToolValidationResponse(**validation_result)
        
    except Exception as e:
        logger.error(f"❌ Tool validation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Tool validation failed: {str(e)}")

@app.get("/tools", response_model=Dict[str, Any])
async def list_available_tools():
    """
    List all available MCP tools
    """
    try:
        if not mcp_client_manager:
            raise HTTPException(status_code=503, detail="MCP client not initialized")
        
        client = await mcp_client_manager.get_client("admin")
        tools = await client.list_available_tools()
        
        return {
            "available_tools": tools.get("tools", []),
            "total_count": len(tools.get("tools", [])),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to list tools: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list tools: {str(e)}")

# Development and debugging endpoints

@app.post("/debug/simulate-query")
async def debug_simulate_query(
    query_type: str,
    user_query: str = "Debug query",
    session_id: Optional[str] = None
):
    """
    Debug endpoint to simulate different query types
    """
    try:
        # Only allow in development mode
        if not workflow_instance:
            raise HTTPException(status_code=503, detail="Workflow not initialized")
        
        logger.info(f"🐛 Debug: Simulating {query_type} query")
        
        # Simulate different query types
        test_queries = {
            "incident_analysis": "What caused the error in database server?",
            "exploration": "Show me all the nodes in the database",
            "root_cause": "Why did the system fail yesterday?",
            "general": "What is the status of the system?"
        }
        
        query = test_queries.get(query_type, user_query)
        
        result = await workflow_instance.process_query(
            user_query=query,
            session_id=session_id or f"debug_session_{query_type}"
        )
        
        return {
            "debug_info": {
                "simulated_query_type": query_type,
                "simulated_query": query
            },
            **result
        }
        
    except Exception as e:
        logger.error(f"❌ Debug simulation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Debug simulation failed: {str(e)}")

# Error handlers

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"❌ Unhandled exception: {str(exc)}")
    return HTTPException(
        status_code=500,
        detail=f"Internal server error: {str(exc)}"
    )

# Main entry point

def create_app() -> FastAPI:
    """Factory function to create the FastAPI app"""
    return app

async def main():
    """Main function for running the server"""
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=False  # Set to True for development
    )
    
    server = uvicorn.Server(config)
    
    logger.info("🌟 Starting LangGraph Orchestrator Server on http://0.0.0.0:8000")
    await server.serve()

if __name__ == "__main__":
    asyncio.run(main())