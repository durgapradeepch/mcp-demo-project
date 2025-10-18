#!/bin/bash
# Quick Start Script for Neo4j MCP Project
# This script starts all services needed for the application

set -e  # Exit on error

echo "🚀 Starting Neo4j MCP Project..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}📍 Project Directory: ${PROJECT_DIR}${NC}"
echo ""

# Step 1: Start Neo4j with Docker
echo -e "${YELLOW}Step 1/4: Starting Neo4j Database...${NC}"
if docker ps | grep -q neo4j-mcp-server; then
    echo -e "${GREEN}✅ Neo4j is already running${NC}"
else
    docker-compose up -d
    echo "⏳ Waiting for Neo4j to be ready..."
    sleep 15
    echo -e "${GREEN}✅ Neo4j started successfully${NC}"
fi
echo ""

# Step 2: Check Neo4j Health
echo -e "${YELLOW}Step 2/4: Checking Neo4j Health...${NC}"
if curl -s http://localhost:7474 > /dev/null; then
    echo -e "${GREEN}✅ Neo4j is healthy and responding${NC}"
else
    echo "❌ Neo4j is not responding. Please check Docker logs:"
    echo "   docker-compose logs neo4j"
    exit 1
fi
echo ""

# Step 3: Install dependencies if needed
echo -e "${YELLOW}Step 3/4: Checking Dependencies...${NC}"
if [ ! -d "mcp-server/node_modules" ]; then
    echo "📦 Installing MCP Server dependencies..."
    cd mcp-server && npm install && cd ..
fi
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing Frontend dependencies..."
    cd frontend && npm install && cd ..
fi
echo -e "${GREEN}✅ Dependencies are ready${NC}"
echo ""

# Step 4: Start the servers
echo -e "${YELLOW}Step 4/4: Starting Application Servers...${NC}"

# Kill any existing processes
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Start MCP Server in background
echo "🔧 Starting MCP Server..."
cd "$PROJECT_DIR/mcp-server"
nohup npm start > server.log 2>&1 &
MCP_PID=$!
sleep 3

# Check if MCP server started
if ps -p $MCP_PID > /dev/null; then
    echo -e "${GREEN}✅ MCP Server started (PID: $MCP_PID)${NC}"
else
    echo "❌ Failed to start MCP Server. Check mcp-server/server.log"
    exit 1
fi

# Start Frontend in background
echo "🎨 Starting Frontend..."
cd "$PROJECT_DIR/frontend"
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 3

# Check if frontend started
if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
else
    echo "❌ Failed to start Frontend. Check frontend/frontend.log"
    exit 1
fi

cd "$PROJECT_DIR"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All services started successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Access your application:${NC}"
echo -e "   🌐 Chatbox Interface:  ${YELLOW}http://localhost:5173/${NC}"
echo -e "   🔧 MCP Server API:     ${YELLOW}http://localhost:3001/${NC}"
echo -e "   🗄️  Neo4j Browser:      ${YELLOW}http://localhost:7474/${NC}"
echo -e "      Username: ${NEO4J_USER:-neo4j}"
echo -e "      Password: ${NEO4J_PASSWORD:-testing@neo4j}"
echo ""
echo -e "${BLUE}📝 Useful commands:${NC}"
echo -e "   View MCP logs:      tail -f mcp-server/server.log"
echo -e "   View Frontend logs: tail -f frontend/frontend.log"
echo -e "   View Neo4j logs:    docker-compose logs -f neo4j"
echo -e "   Stop everything:    ./stop.sh"
echo ""
echo -e "${BLUE}🧪 Test the setup:${NC}"
echo -e "   curl http://localhost:3001/api/mcp/tools"
echo ""
echo -e "${GREEN}Happy querying! 🎉${NC}"
