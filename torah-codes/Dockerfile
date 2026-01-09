# Use Python 3.11 as base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies needed for matplotlib
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    pkg-config \
    libfreetype6-dev \
    libpng-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies with increased timeout
COPY requirements.txt* ./
RUN pip install --no-cache-dir --timeout=300 --retries=3 numpy pandas ipython tqdm matplotlib

# Copy all application files
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Create a startup script
RUN echo '#!/bin/bash\necho "TorahBibleCodes Docker Container"\necho "Run: python p.py to start the application"\necho "Or run: ipython and then %run p.py"\n/bin/bash' > /app/start.sh && \
    chmod +x /app/start.sh

# Expose port (if needed for future web interface)
EXPOSE 8080

# Default command
CMD ["/app/start.sh"]