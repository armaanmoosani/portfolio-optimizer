#!/bin/bash
set -e

echo "Starting GCP VM deployment..."

echo "Pulling latest code..."
git pull

echo "Stopping existing containers..."
sudo docker stop portfolio-backend 2>/dev/null || true
sudo docker rm portfolio-backend 2>/dev/null || true

echo "Building Docker image (with memory limits for e2-micro)..."
sudo docker build \
  --no-cache \
  --build-arg CACHEBUST=$(date +%s) \
  --memory=512m \
  --memory-swap=1g \
  -t portfolio-backend \
  .

echo "🚀 Starting container..."
sudo docker run -d \
  -p 10000:10000 \
  --memory=512m \
  --memory-swap=1g \
  --restart=unless-stopped \
  --name portfolio-backend \
  portfolio-backend

echo "Deployment complete!"
echo ""
echo "Container status:"
sudo docker ps | grep portfolio-backend

echo ""
echo "View logs with: sudo docker logs -f portfolio-backend"
echo "API docs: http://$(curl -s ifconfig.me):10000/api/docs"
docker run -d -p 8000:10000 --restart always --name backend portfolio-backend

echo "Deployment complete! Server is running."
