#!/bin/bash
# Stop Script for JavaScript LangGraph Orchestrator
# This script stops all services for the JavaScript orchestrator

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

echo -e "${BLUE}🛑 Stopping JavaScript LangGraph Orchestrator Project...${NC}"
echo ""

# Function to kill process by PID file
kill_by_pidfile() {
    local pidfile=$1
    local service_name=$2
    
    if [ -f "$pidfile" ]; then
        local pid=$(cat "$pidfile")
        if kill -0 "$pid" 2>/dev/null; then
            echo "🔄 Stopping $service_name (PID: $pid)..."
            kill "$pid" 2>/dev/null || true
            sleep 2
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                echo "🔨 Force stopping $service_name..."
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
        rm -f "$pidfile"
        echo -e "${GREEN}✅ $service_name stopped${NC}"
    else
        echo "⚠️ No PID file found for $service_name"
    fi
}

# Stop JavaScript Orchestrator
echo -e "${YELLOW}Stopping JavaScript Orchestrator...${NC}"
if [ -f "js-orchestrator/orchestrator.pid" ]; then
    kill_by_pidfile "js-orchestrator/orchestrator.pid" "JavaScript Orchestrator"
else
    # Kill by process name if PID file doesn't exist
    echo "🔍 Looking for JavaScript Orchestrator processes..."
    pkill -f "node.*server.js" 2>/dev/null && echo -e "${GREEN}✅ JavaScript Orchestrator stopped${NC}" || echo "⚠️ No JavaScript Orchestrator processes found"
fi

# Stop Frontend
echo -e "${YELLOW}Stopping Frontend Application...${NC}"
if [ -f "frontend/frontend.pid" ]; then
    kill_by_pidfile "frontend/frontend.pid" "Frontend Application"
else
    # Kill by process name if PID file doesn't exist
    echo "🔍 Looking for Frontend processes..."
    pkill -f "vite" 2>/dev/null && echo -e "${GREEN}✅ Frontend Application stopped${NC}" || echo "⚠️ No Frontend processes found"
fi

# Stop Docker services (Neo4j and MCP Server)
echo -e "${YELLOW}Stopping Docker services...${NC}"
if command -v docker-compose &> /dev/null; then
    echo "🔄 Stopping Neo4j and MCP Server..."
    docker-compose down
    echo -e "${GREEN}✅ Docker services stopped${NC}"
else
    echo "⚠️ docker-compose not found, skipping Docker services"
fi

# Clean up any remaining processes
echo -e "${YELLOW}Cleaning up remaining processes...${NC}"

# Kill any remaining node processes that might be related
echo "🧹 Cleaning up Node.js processes..."
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "nodemon.*server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Clean up log files (optional)
echo "🗂️ Cleaning up log files..."
rm -f js-orchestrator/orchestrator.log
rm -f frontend/frontend.log
rm -f js-orchestrator/orchestrator.pid
rm -f frontend/frontend.pid

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All JavaScript LangGraph services stopped!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Stopped Services:${NC}"
echo -e "   🚀 JavaScript Orchestrator (port 8003)"
echo -e "   🌐 Frontend Application (port 5173)"
echo -e "   🔧 MCP Server (port 3001)"
echo -e "   🗄️ Neo4j Database (port 7474)"
echo ""
echo -e "${BLUE}💡 To start again:${NC}"
echo -e "   ${YELLOW}./start-js.sh${NC}"
echo ""