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
RUN echo '#!/bin/sh\n\
# Generate Prisma client with current DATABASE_URL\n\
echo "Generating Prisma client with DATABASE_URL: ${DATABASE_URL//:*@/:****@}"\n\
npx prisma generate\n\
\n\
# Build the application\n\
npm run build\n\
\n\
# Start the application with database initialization\n\
exec ./scripts/start.sh\n\
' > /app/docker-entrypoint.sh \
&& chmod +x /app/docker-entrypoint.sh

# Expose the port
EXPOSE 8080

# Use the entrypoint script
CMD ["/app/docker-entrypoint.sh"]