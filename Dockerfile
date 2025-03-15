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
RUN echo '#!/bin/bash
# Enable debugging to see what is happening
set -x

# Echo all environment variables for debugging (masked)
echo "Environment variables:"
env | grep -v PASSWORD | grep -v SECRET | grep -v KEY

# Generate Prisma client with current DATABASE_URL
if [ -n "$DATABASE_URL" ]; then
  SANITIZED_URL=$(echo "$DATABASE_URL" | sed "s/:[^:]*@/:****@/")
  echo "Generating Prisma client with DATABASE_URL: $SANITIZED_URL"
else
  echo "WARNING: DATABASE_URL is not set!"
fi

# Generate Prisma client
echo "Running prisma generate..."
npx prisma generate

# Build the application
echo "Building application..."
npm run build

# Start the application with database initialization
echo "Starting application..."
exec ./scripts/start.sh
' > /app/docker-entrypoint.sh \
&& chmod +x /app/docker-entrypoint.sh

# Expose the port
EXPOSE 8080

# Use the entrypoint script
CMD ["/app/docker-entrypoint.sh"]