#!/bin/bash

# Enable debugging
set -x

# Maximum number of retries for database connection
MAX_RETRIES=30
RETRY_INTERVAL=2
COUNT=0

# Print shell version for debugging
echo "Shell version: $BASH_VERSION"

# Print environment info (sanitized)
echo "NODE_ENV: $NODE_ENV"
echo "Working directory: $(pwd)"
echo "Directory listing:"
ls -la

# Wait for database to be available
echo "Waiting for database to be available..."

# Function to check connection type and establish connection
check_database_connection() {
  # Test database connection using the init-db script logic but without running migrations
  if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set"
    return 1
  fi

  # Print sanitized DATABASE_URL for debugging
  SANITIZED_URL=$(echo $DATABASE_URL | sed 's/:[^:]*@/:****@/')
  echo "Using database URL: $SANITIZED_URL"

  # Extract username for connection
  DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
  
  # Check connection type and connect appropriately
  
  # Case 1: Cloud SQL socket
  if echo "$DATABASE_URL" | grep -q "host=/cloudsql" || [ -n "$INSTANCE_CONNECTION_NAME" ]; then
    echo "Using Cloud SQL socket connection"
    
    # Get socket path from DATABASE_URL or use INSTANCE_CONNECTION_NAME
    if echo "$DATABASE_URL" | grep -q "host=/cloudsql/"; then
      SOCKET_PATH=$(echo $DATABASE_URL | sed -n 's/.*host=\([^&]*\).*/\1/p')
    elif [ -n "$INSTANCE_CONNECTION_NAME" ]; then
      SOCKET_PATH="/cloudsql/$INSTANCE_CONNECTION_NAME"
    else
      echo "ERROR: Neither socket path in DATABASE_URL nor INSTANCE_CONNECTION_NAME is set"
      return 1
    fi
    
    echo "Trying to connect to Cloud SQL via socket at $SOCKET_PATH"
    
    # Try connecting to database using Cloud SQL socket
    export PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    if psql -h "$SOCKET_PATH" -U $DB_USER -d postgres -c '\l' > /dev/null 2>&1; then
      echo "Database connection successful via Cloud SQL socket"
      return 0
    else
      echo "Cloud SQL socket database connection failed"
      return 1
    fi
  
  # Case 2: Docker/TCP connection (for local development)
  else
    echo "ERROR: Only Cloud SQL socket connections are supported in production"
    echo "Please update DATABASE_URL to use Cloud SQL socket format"
    return 1
  fi
}

# Try to connect with retries
while [ $COUNT -lt $MAX_RETRIES ]; do
  if check_database_connection; then
    echo "Database connection established successfully"
    break
  else
    echo "Database connection failed, retrying in $RETRY_INTERVAL seconds... (Attempt $((COUNT+1))/$MAX_RETRIES)"
    sleep $RETRY_INTERVAL
    COUNT=$((COUNT+1))
  fi
done

if [ $COUNT -eq $MAX_RETRIES ]; then
  echo "WARNING: Could not connect to database after $MAX_RETRIES attempts, but will try to continue"
fi

# Initialize database
echo "Running database initialization script..."
if [ -f "./scripts/init-db.sh" ]; then
  ./scripts/init-db.sh
  
  # Check if initialization was successful
  if [ $? -ne 0 ]; then
    echo "WARNING: Database initialization encountered issues, but continuing startup"
  fi
else
  echo "WARNING: init-db.sh script not found, skipping database initialization"
  # Fallback to just running migrations
  echo "Running database migrations directly..."
  npx prisma migrate deploy
fi

# Regenerate Prisma client to ensure it uses the correct DATABASE_URL
echo "Regenerating Prisma client with current DATABASE_URL..."
npx prisma generate

# Start the application
echo "Starting the application..."
node dist/index.js