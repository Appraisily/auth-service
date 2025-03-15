#!/bin/sh

# Maximum number of retries for database connection
MAX_RETRIES=30
RETRY_INTERVAL=2
COUNT=0

# Wait for database to be available
echo "Waiting for database to be available..."
while [ $COUNT -lt $MAX_RETRIES ]; do
  # Test database connection using the init-db script logic but without running migrations
  if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set"
    sleep $RETRY_INTERVAL
    COUNT=$((COUNT+1))
    continue
  fi

  # Extract connection details from DATABASE_URL
  DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
  DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  
  # Try connecting to database
  export PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
  if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c '\l' > /dev/null 2>&1; then
    echo "Database connection successful"
    break
  else
    echo "Database not available yet, retrying in $RETRY_INTERVAL seconds... (Attempt $COUNT/$MAX_RETRIES)"
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

# Start the application
echo "Starting the application..."
node dist/index.js