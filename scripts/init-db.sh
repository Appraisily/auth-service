#!/bin/bash
# Script to initialize the Cloud SQL database for the auth service

# Create the database if it doesn't exist
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE auth_db;" || echo "Database already exists"

# Apply migrations
cd /app
echo "Running database migrations..."
npx prisma migrate deploy

echo "Database initialization completed."