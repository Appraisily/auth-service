FROM node:18-slim

WORKDIR /app

# Install PostgreSQL client for database connection checks
RUN apt-get update && apt-get install -y postgresql-client && apt-get clean

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy prisma files
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Make scripts executable
RUN chmod +x ./scripts/*.sh

# Create directory for PostgreSQL socket
RUN mkdir -p /var/run/postgresql

# Expose the port
EXPOSE 8080

# Start the application with database initialization
CMD ["./scripts/start.sh"]