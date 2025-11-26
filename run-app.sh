#!/bin/bash

# Stop script on first error
set -e

echo "🚀 Starting Simplified Deployment for Symbiomes..."

# 1. Pull latest changes
echo "📥 Pulling from Git..."
# Use git reset --hard to ensure clean state before building
git fetch origin
git reset --hard origin/main 

# 2. Build the application and extract files to the host machine (build_output)
# Use 'docker compose run' to run the builder once, which executes the Dockerfile's RUN npm run build
echo "🐳 Building static files and copying to host build_output folder..."
docker compose build symbiomes-builder 
docker compose run --rm symbiomes-builder # The --rm removes the container immediately after success

# 3. Clean up the container image history
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

# 4. Restart host Nginx to serve the new files
echo "🔄 Restarting host Nginx..."
# Assuming you use systemctl or similar command on your VPS
sudo systemctl restart nginx 

echo "✅ Deployment Complete!"
echo "👉 Static files are now in the 'build_output' folder on your VPS."