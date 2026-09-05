# Google Cloud Run optimized build
FROM python:3.11-slim

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED True

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy local code to the container image.
COPY . .

# Use the PORT environment variable as required by Cloud Run.
# Default to 8080 if not set.
CMD exec uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1
