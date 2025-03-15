#!/bin/bash

# Enable debugging
set -x

# Maximum number of retries for database connection
MAX_RETRIES=30
RETRY_INTERVAL=2
COUNT=0

# Print debug information
echo "Shell version: $BASH_VERSION"
echo "NODE_ENV: $NODE_ENV"
echo "Working directory: $(pwd)"
echo "Directory listing:"
ls -la

# Check if database connection string is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

# Print sanitized DATABASE_URL for debugging
SANITIZED_URL=$(echo $DATABASE_URL | sed 's/:[^:]*@/:****@/')
echo "Using DATABASE_URL: $SANITIZED_URL"

# Extract database user from DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')

# Check if using Cloud SQL socket or TCP connection
if echo "$DATABASE_URL" | grep -q "host=/cloudsql" || [ -n "$INSTANCE_CONNECTION_NAME" ]; then
  echo "Using Cloud SQL socket connection"
  
  # Get socket path from DATABASE_URL or use INSTANCE_CONNECTION_NAME
  if echo "$DATABASE_URL" | grep -q "host=/cloudsql/"; then
    SOCKET_PATH=$(echo $DATABASE_URL | sed -n 's/.*host=\([^&]*\).*/\1/p')
  elif [ -n "$INSTANCE_CONNECTION_NAME" ]; then
    SOCKET_PATH="/cloudsql/$INSTANCE_CONNECTION_NAME"
  else
    echo "ERROR: Neither socket path in DATABASE_URL nor INSTANCE_CONNECTION_NAME is set"
    exit 1
  fi

  # Set PGPASSWORD from DATABASE_URL
  export PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

  # Test database connection
  if psql -h "$SOCKET_PATH" -U "$DB_USER" -d postgres -c '\l'; then
    echo "Database connection via Cloud SQL socket successful"
    
    # Check if auth_db exists
    echo "Checking if database auth_db exists..."
    if ! psql -h "$SOCKET_PATH" -U "$DB_USER" -d postgres -lqt | cut -d \| -f 1 | grep -qw auth_db; then
      echo "Database auth_db does not exist. Creating..."
      if psql -h "$SOCKET_PATH" -U "$DB_USER" -d postgres -c 'CREATE DATABASE auth_db;'; then
        echo "Database auth_db created successfully"
      else
        echo "ERROR: Failed to create database auth_db."
        exit 1
      fi
    else
      echo "Database auth_db already exists"
    fi
  else
    echo "ERROR: Could not connect to database via socket"
    echo "Please update DATABASE_URL to use Cloud SQL socket format"
    exit 1
  fi
else
  echo "Using TCP connection"
  # Add TCP connection handling if needed
fi

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Regenerate Prisma client to ensure it uses the correct DATABASE_URL
echo "Regenerating Prisma client with current DATABASE_URL..."
npx prisma generate

# Start the application
echo "Starting the application..."
node dist/index.js