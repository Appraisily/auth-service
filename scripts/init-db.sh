#!/bin/bash
# Script to initialize the Cloud SQL database for the auth service

# Log database connection details (sanitized)
echo "Attempting to connect to database..."
echo "DATABASE_URL: ${DATABASE_URL//:*@/:****@}"

# Test database connection
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

# Extract connection details from DATABASE_URL
# Format: postgresql://username:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Testing database connection to $DB_HOST:$DB_PORT as $DB_USER..."

# Try a simple database connection
export PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c '\l' > /dev/null 2>&1; then
    echo "Database connection successful"
else
    echo "ERROR: Failed to connect to database. Check credentials and network connectivity."
    # Continue execution - the application will handle connection errors
fi

# Apply migrations
echo "Running Prisma database migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo "Database migrations completed successfully."
else
    echo "ERROR: Database migrations failed."
    exit 1
fi

echo "Database initialization completed."