#!/bin/bash

# Stop script on first error
set -e

echo "🚀 Starting Deployment for Symbiomes..."

# 1. Pull latest changes (Keep this unchanged)
echo "📥 Pulling from Git..."
git fetch origin
git reset --hard origin/master 

# 2. Execute the Build and Extract files
echo "🐳 Building static files and copying to host build_output folder..."

# Build the image first (this executes the npm ci step)
docker compose build symbiomes-builder 

docker compose run --rm symbiomes-builder sh -c "npm run build:no-check"

# 3. Clean up the container image history (Keep this unchanged)
echo "🧹 Cleaning up old Docker images..."

docker image prune -f

# 4. Restart host Nginx (Keep this unchanged)
echo "🔄 Restarting host Nginx..."

sudo systemctl restart nginx 