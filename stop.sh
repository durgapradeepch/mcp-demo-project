#!/bin/bash
# Stop Script for Neo4j MCP Project
# This script stops all running services

set -e  # Exit on error

echo "🛑 Stopping Neo4j MCP Project..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Stop all Docker Compose services
echo -e "${YELLOW}Stopping all services...${NC}"
docker-compose down

# Check if services actually stopped
echo ""
echo -e "${YELLOW}Verifying services are stopped...${NC}"

# Check Neo4j
if ! docker ps | grep -q neo4j-mcp-server; then
    echo -e "${GREEN}✅ Neo4j stopped${NC}"
else
    echo -e "${RED}⚠️  Neo4j still running${NC}"
fi

# Check MCP Server
if ! curl -f http://localhost:3001/api/mcp/tools > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MCP Server stopped${NC}"
else
    echo -e "${RED}⚠️  MCP Server still responding${NC}"
fi

# Check LangGraph Orchestrator
if ! curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ LangGraph Orchestrator stopped${NC}"
else
    echo -e "${RED}⚠️  LangGraph Orchestrator still responding${NC}"
fi

# Check Frontend
if ! curl -f http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend stopped${NC}"
else
    echo -e "${RED}⚠️  Frontend still responding${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All services stopped successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}💡 To start again, run: ./start.sh${NC}"
echo ""
