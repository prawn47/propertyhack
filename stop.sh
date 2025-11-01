#!/bin/bash
# Stop Quord Development Environment

echo "🛑 Stopping Quord services..."

# Kill processes on ports
lsof -ti:3001 | xargs kill -9 2>/dev/null && echo "  ✅ Backend stopped" || echo "  ℹ️  No backend running"
lsof -ti:3004 | xargs kill -9 2>/dev/null && echo "  ✅ Frontend stopped" || echo "  ℹ️  No frontend running"

echo ""
echo "✅ All services stopped"
