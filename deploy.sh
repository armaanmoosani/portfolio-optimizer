#!/bin/bash

echo "Starting deployment..."

# 1. Pull latest changes
echo "Pulling latest code..."
git pull

# 2. Build new image
echo "Building Docker image..."
docker build -t portfolio-backend .

# 3. Stop and remove old container
echo "Stopping old container..."
docker stop backend || true
docker rm backend || true

# 4. Run new container
echo "Starting new container..."
docker run -d -p 8000:10000 --restart always --name backend portfolio-backend

echo "Deployment complete! Server is running."
