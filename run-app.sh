#!/bin/bash

# Stop script on first error
set -e

echo "🚀 Starting Deployment for Symbiomes..."

# 1. Pull latest changes
# using -X theirs to force overwrite local changes with remote ones if conflicts exist
echo "📥 Pulling from Git..."
git pull -X theirs origin main

# 2. Build and Restart Docker Containers
# --build ensures the Dockerfile is re-run (to capture the new git code)
# -d runs in detached mode (background)
# --remove-orphans cleans up old containers if services changed
echo "🐳 Building and updating Docker containers..."
docker-compose up -d --build --remove-orphans

# 3. Cleanup (Optional)
# Removes unused images (older versions of your build) to save VPS disk space
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Deployment Complete!"
echo "👉 App should be running on localhost:5173"
echo "   (Make sure your Main Host Nginx proxies /games/app/symbiomes to port 5173)"