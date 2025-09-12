#!/bin/bash

echo "🚀 Starting Agent Registry & Marketplace..."
echo "============================================"

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    else
        echo "✅ Port $1 is available"
        return 0
    fi
}

# Check ports before starting
echo "🔍 Checking port availability..."
check_port 5173
check_port 5175
check_port 5176
echo ""

# Start services in background
echo "🔧 Starting services..."
echo "1. Main Application (Port 5173)"
npm run dev &
sleep 2

echo "2. Docker Service (Port 5175)"
node docker-service.js &
sleep 1

echo "3. MCP Integration Service (Port 5176)"
node mcp-integration.js &
sleep 1

echo ""
echo "⏳ Waiting for services to initialize..."
sleep 5

# Check services
echo "🔍 Verifying services..."
node check-services.js

echo ""
echo "🎉 All services started successfully!"
echo "📱 Open your browser to: http://localhost:5173"
echo ""
echo "💡 Useful commands:"
echo "   • Check services: node check-services.js"
echo "   • Stop all: pkill -f 'vite\|docker-service\|mcp-integration'"
echo "   • View logs: Check individual terminal tabs"
