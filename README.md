# Appraisily Auth Service

This service handles authentication and user management for Appraisily. It is designed to be deployed as a microservice on Google Cloud Run.

## Features

- User registration with email verification
- User login with JWT authentication
- Password reset functionality
- User profile management
- Google OAuth integration (planned)

## Tech Stack

- Node.js
- Express
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT for authentication

## Development

1. Install dependencies:
   ```
   npm install
   ```

2. Set up environment variables:
   ```
   cp .env.example .env
   ```
   Then edit `.env` with your actual configuration values.

3. Generate Prisma client:
   ```
   npx prisma generate
   ```

4. Run development server:
   ```
   npm run dev
   ```

## Development with Docker Compose

You can also use Docker Compose to run the service with a local PostgreSQL database connected via Unix socket:

1. Start the services:
   ```
   docker-compose up
   ```

2. The service will be available at http://localhost:8080

3. To stop the services:
   ```
   docker-compose down
   ```

## Deployment to Google Cloud Run

1. Build the Docker image:
   ```
   docker build -t appraisily-auth-service .
   ```

2. Tag the image for Google Container Registry:
   ```
   docker tag appraisily-auth-service gcr.io/[PROJECT_ID]/appraisily-auth-service
   ```

3. Push the image:
   ```
   docker push gcr.io/[PROJECT_ID]/appraisily-auth-service
   ```

4. Deploy to Cloud Run:
   ```
   gcloud run deploy appraisily-auth-service \
     --image gcr.io/[PROJECT_ID]/appraisily-auth-service \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars="DATABASE_URL=postgresql://postgres:password@IP_ADDRESS:5432/auth_db?schema=public"
   ```

## Database Setup

This service uses PostgreSQL as the database. You have two options for database connections:

### Option 1: URL Connection (for Cloud Run deployment)

1. Create a PostgreSQL instance (see CLOUD_DB_SETUP.md for detailed instructions)
2. Create a database named `auth_db`
3. Provide the connection URL in the environment variables:
   ```
   DATABASE_URL=postgresql://username:password@host:port/auth_db?schema=public
   ```

### Option 2: Unix Socket Connection (for local development or container deployment)

1. Set up a PostgreSQL instance that exposes a Unix socket
2. Mount the socket directory in your container
3. Configure the DATABASE_URL with the Unix socket path:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/auth_db?host=/var/run/postgresql
   ```
   
The Docker Compose configuration in this repository demonstrates the Unix socket approach.

## API Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify-email/:token` - Verify email
- `POST /api/auth/reset-password` - Request password reset
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user profile

## Frontend Integration

The frontend should set the `VITE_AUTH_API_URL` environment variable to the URL of this deployed service. For example:

```
VITE_AUTH_API_URL=https://appraisily-auth-service-abcdef.a.run.app/api/auth
```