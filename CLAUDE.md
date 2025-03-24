# Auth Service Development Guide

## Build and Test Commands
```bash
npm install              # Install dependencies
npx prisma generate      # Generate Prisma client
npm run build            # Build TypeScript files
npm run dev              # Run with hot-reload for development
npm run start            # Run production build
npm run lint             # Run ESLint
npm run test             # Run all tests
npm test -- -t "test name"  # Run specific test by name
npm run migrate          # Run Prisma migrations
```

## Architecture
- Repository pattern (not MVC) with controllers, routes, middleware and services
- API uses Express with RESTful endpoints for authentication operations
- PubSub service for event publishing to Google Cloud

## Code Style Guidelines
- **TypeScript**: Strict mode, ES2020 target, no implicit any allowed
- **Imports**: Group imports (node modules first, then local), sort alphabetically
- **Repository Pattern**: Database access through repository layer only
- **Error Handling**: Try/catch with specific error responses, log all errors with Winston
- **Controllers**: Async/await with explicit Promise<Response> returns
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces
- **Authentication**: JWT with httpOnly cookies, refresh tokens for secure session management
- **Security**: Hash passwords with bcryptjs, validate inputs with express-validator
- **Documentation**: JSDoc comments for functions and interfaces
- **Database**: Prisma ORM for PostgreSQL with migrations