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

This service uses PostgreSQL as the database. For Cloud Run deployment, you can connect to a Cloud SQL instance or other PostgreSQL database:

1. Create a PostgreSQL instance
2. Create a database named `auth_db`
3. Provide the connection URL in the environment variables

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