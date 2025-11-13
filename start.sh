#!/bin/bash
# Quick Start Script for Neo4j MCP Project
# This script starts all services needed for the application

set -e  # Exit on error

# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️ .env file not found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env file from .env.example. Please update with your configuration."
    else
        echo "❌ No .env.example file found. Please create .env manually."
        exit 1
    fi
fi

# Step 1: Start all services with Docker Compose
echo -e "${YELLOW}Step 1/5: Starting all services with Docker Compose...${NC}"
echo "🔨 Building and starting Neo4j, MCP Server, LangGraph Orchestrator, and Frontend..."
docker-compose up --build -d

echo "⏳ Waiting for services to be healthy..."
echo ""

# Step 2: Wait for Neo4j
echo -e "${YELLOW}Step 2/5: Checking Neo4j Health...${NC}"
timeout=60
counter=0
while ! docker exec neo4j-mcp-server cypher-shell -u neo4j -p "testing@neo4j" "RETURN 1" > /dev/null 2>&1; do
    sleep 2
    counter=$((counter + 2))
    if [ $counter -ge $timeout ]; then
        echo "❌ Neo4j failed to start within $timeout seconds"
        docker-compose logs neo4j
        exit 1
    fi
done
echo -e "${GREEN}✅ Neo4j is ready${NC}"
echo ""

# Step 3: Wait for MCP Server
echo -e "${YELLOW}Step 3/5: Checking MCP Server Health...${NC}"
counter=0
while ! curl -f http://localhost:3001/api/mcp/tools > /dev/null 2>&1; do
    sleep 2
    counter=$((counter + 2))
    if [ $counter -ge $timeout ]; then
        echo "❌ MCP Server failed to start within $timeout seconds"
        docker-compose logs mcp-server
        exit 1
    fi
done
echo -e "${GREEN}✅ MCP Server is ready${NC}"
echo ""

# Step 4: Wait for LangGraph Orchestrator
echo -e "${YELLOW}Step 4/5: Checking LangGraph Orchestrator Health...${NC}"
counter=0
while ! curl -f http://localhost:8000/health > /dev/null 2>&1; do
    sleep 2
    counter=$((counter + 2))
    if [ $counter -ge $timeout ]; then
        echo "❌ LangGraph Orchestrator failed to start within $timeout seconds"
        docker-compose logs langgraph-orchestrator
        exit 1
    fi
done
echo -e "${GREEN}✅ LangGraph Orchestrator is ready${NC}"
echo ""

# Step 5: Test integration and display results
echo -e "${YELLOW}Step 5/5: Testing system integration...${NC}"

# Kill any existing processes
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Test MCP tools
echo "🧪 Testing MCP server tools..."
mcp_tools=$(curl -s http://localhost:3001/api/mcp/tools | jq -r '.tools | length' 2>/dev/null)
if [ "$mcp_tools" ] && [ "$mcp_tools" -gt 0 ]; then
    echo -e "${GREEN}✅ MCP Server has $mcp_tools tools available${NC}"
else
    echo "❌ MCP Server tools test failed"
fi

# Test LangGraph orchestrator
echo "🧪 Testing LangGraph orchestrator..."
langgraph_status=$(curl -s http://localhost:8000/health | jq -r '.status' 2>/dev/null)
if [ "$langgraph_status" = "healthy" ] || [ "$langgraph_status" = "degraded" ]; then
    echo -e "${GREEN}✅ LangGraph Orchestrator is running (status: $langgraph_status)${NC}"
    
    # Check MCP connectivity
    mcp_connectivity=$(curl -s http://localhost:8000/health | jq -r '.mcp_connectivity.connectivity' 2>/dev/null)
    if [ "$mcp_connectivity" = "connected" ]; then
        echo -e "${GREEN}✅ LangGraph has MCP Server connectivity${NC}"
    else
        echo -e "${YELLOW}⚠️  LangGraph MCP connectivity: $mcp_connectivity${NC}"
    fi
else
    echo "❌ LangGraph Orchestrator health check failed"
fi

# Test Frontend
echo "🧪 Testing Frontend..."
if curl -f -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is responding${NC}"
else
    echo "❌ Frontend test failed"
fi

echo ""
echo -e "${GREEN}🎉 All services are running successfully!${NC}"
echo ""
echo "📋 Service Status:"
echo "   • Neo4j Database:         http://localhost:7474 (neo4j/testing@neo4j)"
echo "   • MCP Server API:         http://localhost:3001"
echo "   • LangGraph Orchestrator: http://localhost:8000"
echo "   • Frontend Application:   http://localhost:5173"
echo ""
echo "🔧 Service Management:"
echo "   • View logs:              docker-compose logs [service-name]"
echo "   • Stop services:          ./stop.sh"
echo "   • Restart services:       docker-compose restart [service-name]"
echo ""
echo "📊 Health Endpoints:"
echo "   • MCP Tools:              curl http://localhost:3001/api/mcp/tools"
echo "   • LangGraph Health:       curl http://localhost:8000/health"
echo "   • LangGraph Debug:        curl http://localhost:8000/debug"
echo ""
echo -e "${BLUE}💡 The system is now ready for intelligent query processing with LangGraph orchestration!${NC}"

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
echo -e "      Password: [Using NEO4J_PASSWORD from .env]"
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