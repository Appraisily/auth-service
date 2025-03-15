#!/bin/sh

# Initialize database
echo "Running database initialization script..."
if [ -f "./scripts/init-db.sh" ]; then
  chmod +x ./scripts/init-db.sh
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