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
npm test -- -t "test name"  # Run specific test
npm run migrate          # Run Prisma migrations
```

## Database Connection
- Local development: `postgresql://username:password@localhost:5432/auth_db`
- Socket connection: `postgresql://username:password@localhost/auth_db?host=/cloudsql/INSTANCE_CONNECTION_NAME`

## Code Style Guidelines
- **Imports**: Group imports (node modules, then local), sort alphabetically
- **Types**: Strong typing with TypeScript, avoid `any` 
- **Error Handling**: Use try/catch with specific error responses, log all errors
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces
- **Controllers**: Async/await pattern with explicit Promise<Response> returns
- **Authentication**: JWT with httpOnly cookies, refresh tokens for session management
- **Logging**: Use logger utility for all logging (imported from utils/logger)
- **Security**: Hash passwords with bcryptjs, sanitize inputs, use validation middleware
- **Documentation**: JSDoc-style comments for functions and interfaces
- **Environment**: Node.js 18+ required (see package.json engines)