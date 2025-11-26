#!/bin/bash

# Stop script on first error
set -e

echo "🚀 Starting Simplified Deployment for Symbiomes..."

# 1. Pull latest changes (Keep this unchanged)
echo "📥 Pulling from Git..."
git fetch origin
git reset --hard origin/master 

echo "⏳ Waiting 5 seconds for container to stabilize..."
sleep 5

docker-compose up -d --build

# 4. Restart host Nginx (Keep this unchanged)
echo "🔄 Restarting host Nginx..."
sudo systemctl restart nginx 

echo "✅ Deployment Complete!"