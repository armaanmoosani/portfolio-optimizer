#!/bin/bash
# Fixed Deployment Script
# 1. Stops on error, but handles cleanup gracefully
# 2. Ensures only ONE container runs
# 3. Memory limits optimized for e2-micro

set -e

echo "deploy: Starting deployment..."

# Ensure we are in the right directory (optional, but good practice)
# cd /path/to/app 

echo "deploy: Pulling latest code..."
git pull

echo "deploy: Stopping and removing old containers..."
# Clean up BOTH names to fix previous double-deploy mess
sudo docker stop portfolio-backend backend 2>/dev/null || true
sudo docker rm portfolio-backend backend 2>/dev/null || true

echo "deploy: Pruning unused images to save space..."
sudo docker image prune -f

echo "deploy: Building Docker image..."
# Use --no-cache to ensure fresh code
# Limit memory during build to prevent freeze
sudo docker build \
  --build-arg CACHEBUST=$(date +%s) \
  -t portfolio-backend \
  .

echo "deploy: Starting NEW container..."
# Run on port 8000 (standard HTTP) mapped to internal 8000 (FastAPI default) 
# Note: Check if your FastAPI app listens on 8000 or 10000. 
# Previous script assumed 10000 internal. `main.py` says `uvicorn.run(..., port=8000)`.
# So we should map 8000:8000.

# MAPPING: Host 10000 -> Container 10000 (Defined in Dockerfile)
sudo docker run -d \
  -p 10000:10000 \
  --memory=512m \
  --memory-swap=1g \
  --restart=unless-stopped \
  --name portfolio-backend \
  portfolio-backend

echo "deploy: Verifying..."
sleep 5
if sudo docker ps | grep -q portfolio-backend; then
    echo "✅ Success! Container is running."
    echo "   See logs: sudo docker logs -f portfolio-backend"
    echo "   API docs: http://$(curl -s ifconfig.me):10000/api/docs"
else
    echo "❌ Error: Container failed to start."
    sudo docker logs portfolio-backend
    exit 1
fi
