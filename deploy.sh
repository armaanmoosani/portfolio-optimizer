#!/bin/bash

echo "Starting GCP VM deployment (Aggressive Cleanup Mode)..."

# Pull latest code
echo "Pulling latest code..."
git pull origin master

# Remove pycache to prevent stale bytecode
echo "Cleaning up pycache..."
find . -type d -name "__pycache__" -exec rm -rf {} +

# Stop and remove ALL related containers
echo "Stopping existing containers..."
sudo docker stop portfolio-backend backend 2>/dev/null || true
sudo docker rm portfolio-backend backend 2>/dev/null || true

# Prune unused images/build cache to force fresh start
echo "Pruning docker system..."
sudo docker system prune -f

echo "Building Docker image (V3)..."
# Use a unique name for the image to avoid cache
sudo docker build \
  --no-cache \
  --build-arg CACHEBUST=$(date +%s) \
  -t portfolio-backend-v3 \
  .

echo "🚀 Starting container..."
# Map port 10000 (host) to 10000 (container)
# Dockerfile CMD specifies port 10000
sudo docker run -d \
  -p 10000:10000 \
  --restart=unless-stopped \
  --name portfolio-backend \
  portfolio-backend-v3

echo "Deployment complete!"
echo "Container status:"
sudo docker ps | grep portfolio-backend

echo "View logs with: sudo docker logs -f portfolio-backend"
