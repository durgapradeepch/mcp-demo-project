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

# Stop Node.js processes
echo -e "${YELLOW}Stopping application servers...${NC}"
pkill -f "node.*server.js" 2>/dev/null && echo -e "${GREEN}✅ MCP Server stopped${NC}" || echo "ℹ️  MCP Server was not running"
pkill -f "vite" 2>/dev/null && echo -e "${GREEN}✅ Frontend stopped${NC}" || echo "ℹ️  Frontend was not running"
sleep 2

# Stop Docker containers
echo ""
echo -e "${YELLOW}Stopping Neo4j Docker container...${NC}"
docker-compose down
echo -e "${GREEN}✅ Neo4j stopped${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All services stopped successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}💡 To start again, run: ./start.sh${NC}"
echo ""
