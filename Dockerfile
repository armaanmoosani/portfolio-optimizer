# Use slim image (50% smaller, less memory during build)
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies for numpy/scipy (but no compilation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install packages ONE AT A TIME to avoid memory spikes on e2-micro
RUN pip install --no-cache-dir numpy && \
    pip install --no-cache-dir pandas && \
    pip install --no-cache-dir scipy && \
    pip install --no-cache-dir -r requirements.txt

# Cache bust to ensure fresh code on every build
ARG CACHEBUST=1

# Copy application code
COPY backend ./backend

# Run the app
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "10000"]
