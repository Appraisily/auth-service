FROM node:18-slim

WORKDIR /app

# Install PostgreSQL client for database connection checks
RUN apt-get update && apt-get install -y postgresql-client && apt-get clean

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy prisma files
COPY prisma ./prisma/

# Copy the rest of the application
COPY . .

# Make scripts executable
RUN chmod +x ./scripts/*.sh

# Create directories for PostgreSQL sockets
RUN mkdir -p /var/run/postgresql
RUN mkdir -p /cloudsql

# Create setup script that runs before the application
RUN echo '#!/bin/bash' > /app/docker-entrypoint.sh && \
    echo 'set -x' >> /app/docker-entrypoint.sh && \
    echo 'echo "Environment variables:"' >> /app/docker-entrypoint.sh && \
    echo 'env | grep -v PASSWORD | grep -v SECRET | grep -v KEY' >> /app/docker-entrypoint.sh && \
    echo 'if [ -n "$INSTANCE_CONNECTION_NAME" ]; then' >> /app/docker-entrypoint.sh && \
    echo '  export DATABASE_URL="postgresql://auth-app-user:${DB_PASSWORD}@localhost/auth_db?host=/cloudsql/${INSTANCE_CONNECTION_NAME}"' >> /app/docker-entrypoint.sh && \
    echo '  echo "Using Cloud SQL socket connection"' >> /app/docker-entrypoint.sh && \
    echo 'else' >> /app/docker-entrypoint.sh && \
    echo '  echo "WARNING: INSTANCE_CONNECTION_NAME is not set!"' >> /app/docker-entrypoint.sh && \
    echo 'fi' >> /app/docker-entrypoint.sh && \
    echo 'echo "Running prisma generate..."' >> /app/docker-entrypoint.sh && \
    echo 'npx prisma generate' >> /app/docker-entrypoint.sh && \
    echo 'echo "Building application..."' >> /app/docker-entrypoint.sh && \
    echo 'npm run build' >> /app/docker-entrypoint.sh && \
    echo 'echo "Starting application..."' >> /app/docker-entrypoint.sh && \
    echo 'exec ./scripts/start.sh' >> /app/docker-entrypoint.sh && \
    chmod +x /app/docker-entrypoint.sh

# Expose the port
EXPOSE 8080

# Use the entrypoint script
CMD ["/app/docker-entrypoint.sh"]