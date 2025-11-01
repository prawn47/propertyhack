#!/bin/bash
# Quord Local Development Startup Script

set -e

echo "🚀 Starting Quord Development Environment"
echo ""

# Kill any existing processes on ports 3001 and 3004
echo "🧹 Cleaning up old processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3004 | xargs kill -9 2>/dev/null || true
sleep 1

# Check dependencies
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "  ❌ Frontend dependencies missing. Installing..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "  ❌ Backend dependencies missing. Installing..."
    cd server && npm install && cd ..
fi

# Check Prisma client
echo "🔍 Checking Prisma client..."
if [ ! -d "server/node_modules/.prisma" ]; then
    echo "  ⚙️  Generating Prisma client..."
    cd server && npm run db:generate && cd ..
fi

# Check database exists
echo "🗄️  Checking database..."
if [ ! -f "server/prisma/dev.db" ]; then
    echo "  ⚠️  Database not found. Run migrations:"
    echo "     cd server && npm run db:migrate"
    echo ""
fi

# Check environment files
echo "🔐 Checking environment files..."
if [ ! -f ".env" ]; then
    echo "  ⚠️  Root .env file missing!"
fi
if [ ! -f "server/.env" ]; then
    echo "  ⚠️  server/.env file missing!"
fi

echo ""
echo "✅ Pre-flight checks complete"
echo ""
echo "🎬 Starting services..."
echo ""

# Start backend in background
echo "  🔧 Starting backend on http://localhost:3001"
cd server
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Check if backend started successfully
if ! lsof -ti:3001 > /dev/null; then
    echo "  ❌ Backend failed to start. Check backend.log"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start frontend in background
echo "  ⚛️  Starting frontend on http://localhost:3004"
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 3

# Check if frontend started successfully
if ! lsof -ti:3004 > /dev/null; then
    echo "  ❌ Frontend failed to start. Check frontend.log"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "✅ Both services running!"
echo ""
echo "📍 Frontend: http://localhost:3004"
echo "📍 Backend:  http://localhost:3001"
echo ""
echo "📊 Process IDs:"
echo "   Backend:  $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo ""
echo "🛑 To stop: lsof -ti:3001 :3004 | xargs kill -9"
echo ""
