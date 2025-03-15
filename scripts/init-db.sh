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

# Check for Cloud SQL socket connection
if echo "$DATABASE_URL" | grep -q "host=/cloudsql"; then
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
        # Continue execution - the application will handle connection errors
    fi
# Check for regular Unix socket connection
elif echo "$DATABASE_URL" | grep -q "host=/var/run/postgresql"; then
    # Extract connection details for Unix socket
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    SOCKET_PATH="/var/run/postgresql"

    echo "Testing database connection via Unix socket $SOCKET_PATH as $DB_USER..."
    
    # Try a simple database connection via Unix socket
    export PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    if psql -h $SOCKET_PATH -U $DB_USER -d postgres -c '\l' > /dev/null 2>&1; then
        echo "Database connection via Unix socket successful"
    else
        echo "ERROR: Failed to connect to database via Unix socket. Check socket path and credentials."
        # Continue execution - the application will handle connection errors
    fi
else
    # Extract connection details from DATABASE_URL for TCP connection
    # Format: postgresql://username:password@host:port/database
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

    echo "Testing database connection to $DB_HOST:$DB_PORT as $DB_USER..."

    # Try a simple database connection via TCP
    export PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c '\l' > /dev/null 2>&1; then
        echo "Database connection successful"
    else
        echo "ERROR: Failed to connect to database. Check credentials and network connectivity."
        # Continue execution - the application will handle connection errors
    fi
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