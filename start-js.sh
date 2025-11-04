#!/bin/bash
# Start Script for JavaScript LangGraph Orchestrator
# This script starts all services using the new JavaScript orchestrator

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}🚀 Starting JavaScript LangGraph Orchestrator Project...${NC}"
echo -e "${BLUE}📍 Project Directory: ${PROJECT_DIR}${NC}"
echo ""

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    echo "🔄 Freeing up port $port..."
    lsof -ti :$port | xargs kill -9 2>/dev/null || true
    sleep 1
}

# Function to wait for service
wait_for_service() {
    local url=$1
    local name=$2
    local timeout=${3:-60}
    local counter=0
    
    echo "⏳ Waiting for $name to be ready..."
    while ! curl -f -s "$url" > /dev/null 2>&1; do
        sleep 2
        counter=$((counter + 2))
        if [ $counter -ge $timeout ]; then
            echo -e "${RED}❌ $name failed to start within $timeout seconds${NC}"
            return 1
        fi
        echo -n "."
    done
    echo ""
    echo -e "${GREEN}✅ $name is ready${NC}"
}

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Check if JavaScript orchestrator environment is set up
if [ ! -f "js-orchestrator/.env" ]; then
    echo "⚠️ js-orchestrator/.env file not found. Creating from template..."
    if [ -f "js-orchestrator/.env.example" ]; then
        cp js-orchestrator/.env.example js-orchestrator/.env
        echo "✅ Created js-orchestrator/.env file from template."
    fi
fi

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1/6: Starting Neo4j and MCP Server with Docker Compose...${NC}"

# Start only Neo4j and MCP Server from docker-compose
echo "🔨 Starting Neo4j and MCP Server..."
docker-compose up -d neo4j mcp-server

echo ""
echo -e "${YELLOW}Step 2/6: Checking Neo4j Health...${NC}"
timeout=60
counter=0
while ! docker exec neo4j-mcp-server cypher-shell -u neo4j -p "testing@neo4j" "RETURN 1" > /dev/null 2>&1; do
    sleep 2
    counter=$((counter + 2))
    if [ $counter -ge $timeout ]; then
        echo -e "${RED}❌ Neo4j failed to start within $timeout seconds${NC}"
        docker-compose logs neo4j
        exit 1
    fi
    echo -n "."
done
echo ""
echo -e "${GREEN}✅ Neo4j is ready${NC}"

echo ""
echo -e "${YELLOW}Step 3/6: Checking MCP Server Health...${NC}"
wait_for_service "http://localhost:3001/api/mcp/tools" "MCP Server" || exit 1

echo ""
echo -e "${YELLOW}Step 4/6: Setting up JavaScript Orchestrator...${NC}"

# Kill any existing Node processes
echo "🧹 Cleaning up existing processes..."
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "nodemon.*server.js" 2>/dev/null || true

# Free up ports if needed
if check_port 8003; then
    kill_port 8003
fi

# Navigate to JS orchestrator directory
cd "$PROJECT_DIR/js-orchestrator"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

echo ""
echo -e "${YELLOW}Step 5/6: Starting JavaScript Orchestrator...${NC}"

# Start the JavaScript orchestrator in background
echo "🚀 Starting JavaScript LangGraph Orchestrator on port 8003..."
nohup node server.js > orchestrator.log 2>&1 &
JS_ORCHESTRATOR_PID=$!
echo $JS_ORCHESTRATOR_PID > orchestrator.pid

# Wait for JavaScript orchestrator
echo "⏳ Waiting for JavaScript Orchestrator to be ready..."
sleep 3
wait_for_service "http://localhost:8003/health" "JavaScript Orchestrator" || {
    echo -e "${RED}❌ Failed to start JavaScript Orchestrator${NC}"
    echo "📋 Last 20 lines of log:"
    tail -20 orchestrator.log
    exit 1
}

echo ""
echo -e "${YELLOW}Step 6/6: Starting Frontend Application...${NC}"

# Navigate to frontend directory
cd "$PROJECT_DIR/frontend"

# Kill any existing frontend processes
pkill -f "vite" 2>/dev/null || true
if check_port 5173; then
    kill_port 5173
fi

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Frontend dependencies..."
    npm install
fi

# Start the frontend in background
echo "🎨 Starting Frontend Application on port 5173..."
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > frontend.pid

# Wait for frontend
sleep 5
wait_for_service "http://localhost:5173" "Frontend Application" || {
    echo -e "${RED}❌ Failed to start Frontend Application${NC}"
    echo "📋 Last 20 lines of log:"
    tail -20 frontend.log
    exit 1
}

# Return to project directory
cd "$PROJECT_DIR"

echo ""
echo -e "${GREEN}🎉 All services are running successfully with JavaScript Orchestrator!${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ JavaScript LangGraph System Started!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
echo -e "   🗄️  Neo4j Database:        ${YELLOW}http://localhost:7474${NC} (neo4j/testing@neo4j)"
echo -e "   🔧 MCP Server API:         ${YELLOW}http://localhost:3001${NC}"
echo -e "   🚀 JS Orchestrator:        ${YELLOW}http://localhost:8003${NC}"
echo -e "   🌐 Frontend Chat:          ${YELLOW}http://localhost:5173${NC}"
echo ""
echo -e "${BLUE}💬 Test the Chatbot:${NC}"
echo -e "   1. Open: ${YELLOW}http://localhost:5173${NC}"
echo -e "   2. Try queries like:"
echo -e "      • 'What is the system status?'"
echo -e "      • 'Show me recent incidents'"
echo -e "      • 'What are the available tools?'"
echo ""
echo -e "${BLUE}🔧 API Endpoints:${NC}"
echo -e "   • Health Check:     ${YELLOW}curl http://localhost:8003/health${NC}"
echo -e "   • Server Status:    ${YELLOW}curl http://localhost:8003/status${NC}"
echo -e "   • MCP Tools:        ${YELLOW}curl http://localhost:3001/api/mcp/tools${NC}"
echo -e "   • Chat API:         ${YELLOW}curl -X POST http://localhost:8003/chat -H 'Content-Type: application/json' -d '{\"query\":\"Hello\"}'${NC}"
echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo -e "   • JS Orchestrator:  ${YELLOW}tail -f js-orchestrator/orchestrator.log${NC}"
echo -e "   • Frontend:         ${YELLOW}tail -f frontend/frontend.log${NC}"
echo -e "   • MCP Server:       ${YELLOW}docker-compose logs -f mcp-server${NC}"
echo -e "   • Neo4j:            ${YELLOW}docker-compose logs -f neo4j${NC}"
echo ""
echo -e "${BLUE}🛑 Stop Services:${NC}"
echo -e "   ${YELLOW}./stop-js.sh${NC}  (or kill processes manually)"
echo ""

# Test the system
echo -e "${YELLOW}🧪 Quick System Test:${NC}"

# Test MCP tools
mcp_tools=$(curl -s http://localhost:3001/api/mcp/tools | jq -r '.length' 2>/dev/null || echo "0")
echo "   MCP Tools Available: $mcp_tools"

# Test JS Orchestrator
js_health=$(curl -s http://localhost:8003/health | jq -r '.status' 2>/dev/null || echo "unknown")
echo "   JS Orchestrator: $js_health"

# Test Frontend
if curl -f -s http://localhost:5173 > /dev/null 2>&1; then
    echo "   Frontend: responding"
else
    echo "   Frontend: not responding"
fi

echo ""
echo -e "${GREEN}🎊 JavaScript LangGraph Orchestrator is ready!${NC}"
echo -e "${GREEN}   Open ${YELLOW}http://localhost:5173${GREEN} to start chatting!${NC}"
echo ""