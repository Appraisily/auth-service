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

# Extract connection details for Cloud SQL Unix socket
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Get socket path from DATABASE_URL or use INSTANCE_CONNECTION_NAME
if echo "$DATABASE_URL" | grep -q "host=/cloudsql/"; then
    SOCKET_PATH=$(echo $DATABASE_URL | sed -n 's/.*host=\([^&]*\).*/\1/p')
elif [ -n "$INSTANCE_CONNECTION_NAME" ]; then
    SOCKET_PATH="/cloudsql/$INSTANCE_CONNECTION_NAME"
else
    echo "ERROR: Neither socket path in DATABASE_URL nor INSTANCE_CONNECTION_NAME is set"
    exit 1
fi

echo "Testing database connection via Cloud SQL socket $SOCKET_PATH as $DB_USER..."

# Try a simple database connection via Cloud SQL socket
export PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
if psql -h "$SOCKET_PATH" -U $DB_USER -d postgres -c '\l' > /dev/null 2>&1; then
    echo "Database connection via Cloud SQL socket successful"
else
    echo "ERROR: Failed to connect to database via Cloud SQL socket. Check socket path and credentials."
    exit 1
fi

# Create database if it doesn't exist
echo "Checking if database $DB_NAME exists..."
if ! psql -h "$SOCKET_PATH" -U $DB_USER -d postgres -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "Database $DB_NAME does not exist. Creating..."
    psql -h "$SOCKET_PATH" -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "Database $DB_NAME created successfully."
    else
        echo "ERROR: Failed to create database $DB_NAME."
        exit 1
    fi
else
    echo "Database $DB_NAME already exists."
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