#!/bin/bash

# Stop script on first error
set -e

echo "🚀 Starting Deployment for Symbiomes..."

# 1. Pull latest changes (Keep this unchanged)
echo "📥 Pulling from Git..."
git fetch origin
git reset --hard origin/master 

docker compose down

docker-compose up -d --build

echo "⏳ Waiting 5 seconds for container to stabilize..."
sleep 5

# 4. Restart host Nginx (Keep this unchanged)
echo "🔄 Restarting host Nginx..."
sudo systemctl restart nginx 

echo "✅ Deployment Complete!"