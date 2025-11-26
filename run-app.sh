#!/bin/bash

# Stop script on first error
set -e

echo "🚀 Starting Simplified Deployment for Symbiomes..."

# 1. Pull latest changes (Keep this unchanged)
echo "📥 Pulling from Git..."
git fetch origin
git reset --hard origin/master 

# 2. Execute the Build and Extract files
echo "🐳 Building static files and copying to host build_output folder..."

# Build the image first (this executes the npm ci step)
docker compose build symbiomes-builder 

# Run the container once to execute the build command, ensuring it exits after completion.
# The 'npm run build:no-check' command extracts the files to the mapped volume.
# The '--rm' flag cleans up the container immediately after it exits.
docker compose run --rm symbiomes-builder sh -c "npm run build:no-check"

# 3. Clean up the container image history (Keep this unchanged)
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

# 4. Restart host Nginx (Keep this unchanged)
echo "🔄 Restarting host Nginx..."
sudo systemctl restart nginx 

echo "✅ Deployment Complete!"