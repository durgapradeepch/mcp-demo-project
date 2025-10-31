"""
MCP Client - Communicates with the existing MCP server to execute tools
"""

import logging
import aiohttp
import asyncio
from typing import Dict, Any, Optional
import json

logger = logging.getLogger(__name__)

class MCPClient:
    """
    Client for communicating with the existing MCP server
    Handles tool execution, error handling, and response processing
    """
    
    def __init__(self, mcp_server_url: str = "http://localhost:3001"):
        self.mcp_server_url = mcp_server_url
        self.session = None
        
        # Client configuration
        self.config = {
            "timeout": 30.0,
            "max_retries": 3,
            "retry_delay": 1.0
        }
        
        # Tool endpoint mapping
        self.endpoints = {
            "execute_tool": f"{mcp_server_url}/api/mcp/execute",
            "list_tools": f"{mcp_server_url}/api/mcp/tools",
            "health_check": f"{mcp_server_url}/api/health"
        }
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.config["timeout"])
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def execute_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a single MCP tool with the given parameters
        """
        try:
            logger.info(f"🔧 Executing MCP tool: {tool_name}")
            
            # Prepare request payload
            payload = {
                "tool_name": tool_name,
                "parameters": parameters
            }
            
            # Execute with retry logic
            for attempt in range(self.config["max_retries"]):
                try:
                    result = await self._make_request(
                        "POST", 
                        self.endpoints["execute_tool"], 
                        json=payload
                    )
                    
                    logger.info(f"✅ Tool {tool_name} executed successfully")
                    return result
                    
                except Exception as e:
                    if attempt < self.config["max_retries"] - 1:
                        logger.warning(f"⚠️ Tool {tool_name} attempt {attempt + 1} failed: {str(e)}, retrying...")
                        await asyncio.sleep(self.config["retry_delay"] * (attempt + 1))
                    else:
                        raise
            
        except Exception as e:
            logger.error(f"❌ Tool {tool_name} execution failed: {str(e)}")
            raise MCPClientError(f"Failed to execute tool {tool_name}: {str(e)}")
    
    async def list_available_tools(self) -> Dict[str, Any]:
        """
        Get list of available MCP tools from the server
        """
        try:
            logger.info("📋 Fetching available MCP tools")
            
            result = await self._make_request("GET", self.endpoints["list_tools"])
            
            logger.info(f"✅ Retrieved {len(result.get('tools', []))} available tools")
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to fetch tools list: {str(e)}")
            raise MCPClientError(f"Failed to fetch tools list: {str(e)}")
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Check the health status of the MCP server
        """
        try:
            result = await self._make_request("GET", self.endpoints["health_check"])
            return {
                "status": "healthy",
                "server_response": result
            }
        except Exception as e:
            logger.warning(f"⚠️ MCP server health check failed: {str(e)}")
            return {
                "status": "unhealthy", 
                "error": str(e)
            }
    
    async def execute_multiple_tools(self, tool_requests: list[Dict[str, Any]]) -> list[Dict[str, Any]]:
        """
        Execute multiple tools in parallel
        """
        logger.info(f"🔧 Executing {len(tool_requests)} MCP tools in parallel")
        
        tasks = []
        for request in tool_requests:
            task = asyncio.create_task(
                self._execute_tool_with_error_handling(
                    request["tool_name"],
                    request["parameters"]
                )
            )
            tasks.append((request["tool_name"], task))
        
        results = []
        for tool_name, task in tasks:
            try:
                result = await task
                results.append({
                    "tool_name": tool_name,
                    "success": True,
                    "result": result
                })
            except Exception as e:
                logger.error(f"❌ Parallel execution failed for {tool_name}: {str(e)}")
                results.append({
                    "tool_name": tool_name,
                    "success": False,
                    "error": str(e)
                })
        
        successful_count = sum(1 for r in results if r["success"])
        logger.info(f"✅ Parallel execution completed: {successful_count}/{len(results)} tools successful")
        
        return results
    
    async def _execute_tool_with_error_handling(self, tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute tool with comprehensive error handling"""
        try:
            return await self.execute_tool(tool_name, parameters)
        except MCPClientError:
            raise
        except Exception as e:
            raise MCPClientError(f"Unexpected error executing {tool_name}: {str(e)}")
    
    async def _make_request(self, method: str, url: str, **kwargs) -> Dict[str, Any]:
        """
        Make HTTP request to MCP server with error handling
        """
        if not self.session:
            raise MCPClientError("MCP client session not initialized. Use async context manager.")
        
        try:
            async with self.session.request(method, url, **kwargs) as response:
                
                # Check for HTTP errors
                if response.status >= 400:
                    error_text = await response.text()
                    raise MCPClientError(f"HTTP {response.status}: {error_text}")
                
                # Parse response
                response_data = await response.json()
                
                # Check for application-level errors
                if isinstance(response_data, dict):
                    if response_data.get("success") is False:
                        error_msg = response_data.get("error", "Unknown error")
                        raise MCPClientError(f"MCP server error: {error_msg}")
                
                return response_data
                
        except aiohttp.ClientError as e:
            raise MCPClientError(f"Network error: {str(e)}")
        except json.JSONDecodeError as e:
            raise MCPClientError(f"Invalid JSON response: {str(e)}")
        except asyncio.TimeoutError:
            raise MCPClientError("Request timed out")


class MCPClientError(Exception):
    """Custom exception for MCP client errors"""
    pass


class MCPClientManager:
    """
    Manager for MCP client instances with connection pooling and monitoring
    """
    
    def __init__(self, mcp_server_url: str = "http://localhost:3001"):
        self.mcp_server_url = mcp_server_url
        self.clients = {}
        self.connection_stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "average_response_time": 0.0
        }
    
    async def get_client(self, session_id: str = "default") -> MCPClient:
        """
        Get or create MCP client for a session
        """
        if session_id not in self.clients:
            client = MCPClient(self.mcp_server_url)
            await client.__aenter__()  # Initialize session
            self.clients[session_id] = client
            
            # Perform initial health check
            health = await client.health_check()
            if health["status"] != "healthy":
                logger.warning(f"⚠️ MCP server health check failed for session {session_id}")
        
        return self.clients[session_id]
    
    async def execute_tool_managed(self, tool_name: str, parameters: Dict[str, Any], 
                                 session_id: str = "default") -> Dict[str, Any]:
        """
        Execute tool through managed client with monitoring
        """
        import time
        start_time = time.time()
        
        try:
            client = await self.get_client(session_id)
            result = await client.execute_tool(tool_name, parameters)
            
            # Update stats
            self.connection_stats["total_requests"] += 1
            self.connection_stats["successful_requests"] += 1
            
            execution_time = time.time() - start_time
            self._update_average_response_time(execution_time)
            
            return result
            
        except Exception as e:
            self.connection_stats["total_requests"] += 1
            self.connection_stats["failed_requests"] += 1
            raise
    
    async def cleanup_session(self, session_id: str):
        """Clean up client session"""
        if session_id in self.clients:
            client = self.clients[session_id]
            await client.__aexit__(None, None, None)
            del self.clients[session_id]
            logger.info(f"🧹 Cleaned up MCP client session: {session_id}")
    
    async def cleanup_all_sessions(self):
        """Clean up all client sessions"""
        for session_id in list(self.clients.keys()):
            await self.cleanup_session(session_id)
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        total_requests = self.connection_stats["total_requests"]
        success_rate = (
            self.connection_stats["successful_requests"] / total_requests 
            if total_requests > 0 else 0
        )
        
        return {
            **self.connection_stats,
            "success_rate": success_rate,
            "active_sessions": len(self.clients)
        }
    
    def _update_average_response_time(self, execution_time: float):
        """Update average response time with new measurement"""
        current_avg = self.connection_stats["average_response_time"]
        total_requests = self.connection_stats["total_requests"]
        
        # Calculate new average
        new_avg = ((current_avg * (total_requests - 1)) + execution_time) / total_requests
        self.connection_stats["average_response_time"] = new_avg


# Utility functions for MCP integration

async def test_mcp_connectivity(server_url: str = "http://localhost:3001") -> Dict[str, Any]:
    """
    Test connectivity to MCP server
    """
    async with MCPClient(server_url) as client:
        try:
            # Test health check
            health = await client.health_check()
            
            # Test tools list
            tools = await client.list_available_tools()
            
            return {
                "connectivity": "successful",
                "server_health": health,
                "available_tools": len(tools.get("tools", [])),
                "tools_list": tools.get("tools", [])
            }
            
        except Exception as e:
            return {
                "connectivity": "failed",
                "error": str(e)
            }

async def validate_tool_availability(required_tools: list[str], 
                                   server_url: str = "http://localhost:3001") -> Dict[str, Any]:
    """
    Validate that required tools are available on the MCP server
    """
    async with MCPClient(server_url) as client:
        try:
            tools_response = await client.list_available_tools()
            available_tools = [tool.get("name") for tool in tools_response.get("tools", [])]
            
            missing_tools = [tool for tool in required_tools if tool not in available_tools]
            
            return {
                "validation": "passed" if not missing_tools else "failed",
                "required_tools": required_tools,
                "available_tools": available_tools,
                "missing_tools": missing_tools
            }
            
        except Exception as e:
            return {
                "validation": "error",
                "error": str(e)
            }