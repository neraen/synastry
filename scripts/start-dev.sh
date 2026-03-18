#!/bin/bash

# AstroMatch Development Startup Script
# This script helps start the backend and shows the local IP for mobile development

set -e

echo "🚀 AstroMatch Development Setup"
echo "================================"

# Get local IP
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
echo ""
echo "📱 Your local IP address: $LOCAL_IP"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Start Docker containers
echo "🐳 Starting Docker containers..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if containers are running
if docker compose ps | grep -q "Up"; then
    echo "✅ Containers are running"
else
    echo "❌ Some containers failed to start. Check logs with: docker compose logs"
    exit 1
fi

echo ""
echo "================================"
echo "🎉 Backend is ready!"
echo ""
echo "📍 Backend URL: http://$LOCAL_IP:8000"
echo "📍 Adminer (DB): http://localhost:8080"
echo ""
echo "📱 For your mobile app, update app/.env:"
echo "   EXPO_PUBLIC_API_URL=http://$LOCAL_IP:8000"
echo ""
echo "💡 Useful commands:"
echo "   docker compose logs -f     # View logs"
echo "   docker compose down        # Stop containers"
echo "   docker compose ps          # Check status"
echo "================================"