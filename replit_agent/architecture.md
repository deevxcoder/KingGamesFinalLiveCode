# Architecture Overview

## 1. Overview

This application is a full-stack gaming platform with multiple betting games like coin flip, cricket toss, sports betting, and Satamatka (a type of lottery game). The system includes user management with different roles (admin, subadmin, player), wallet functionality for deposits and withdrawals, commission management, and comprehensive game administration.

The architecture follows a modern client-server model with a React frontend and Node.js Express backend. Data is stored in PostgreSQL using Drizzle ORM for database operations.

## 2. System Architecture

The application follows a modular architecture with clear separation between client and server:

```
├── client/ - React frontend application
├── server/ - Express backend server
└── shared/ - Shared types and schemas used by both client and server
```

### Frontend Architecture

The frontend is built with React using a component-based architecture. It employs the following patterns:

- **State Management**: Combines React hooks with TanStack Query for server state
- **Routing**: Uses Wouter for lightweight routing
- **Component Design**: Employs a component library built on Shadcn/UI components
- **Authentication**: Implements custom authentication hooks with context for app-wide auth state

### Backend Architecture

The backend is an Express.js server with the following architecture:

- **API Routes**: RESTful API endpoints organized by domain
- **Authentication**: Session-based authentication with Passport.js
- **Database Access**: Data access layer using Drizzle ORM
- **Storage**: PostgreSQL database for persistent storage
- **Session Management**: Connect-PG-Simple for PostgreSQL session storage

### Database Architecture

The application uses PostgreSQL with Drizzle ORM. The schema includes several key entities:

- Users (with roles: admin, subadmin, player)
- Games (different types and their associated data)
- Transactions (for wallet operations)
- Markets (for Satamatka games)
- Team Matches (for sports betting)
- Various settings and configuration tables

## 3. Key Components

### 3.1 Authentication System

The authentication system uses session-based authentication with Passport.js:

- **Session Storage**: Sessions are stored in PostgreSQL using connect-pg-simple
- **Password Hashing**: Passwords are hashed using bcrypt
- **Role-Based Access Control**: Different routes are protected based on user roles

### 3.2 User Management

User management includes:

- **Role Hierarchy**: Admin > Subadmin > Player
- **Subadmin System**: Admins can create subadmins who manage their own players
- **Balance Management**: Each user has a balance for placing bets
- **Commission System**: Configurable commission rates for subadmins

### 3.3 Game System

The platform supports multiple game types:

- **Coin Flip**: Simple heads/tails betting game
- **Cricket Toss**: Bet on cricket match toss outcomes
- **Sports Betting**: Bet on team matches with various odds
- **Satamatka**: Indian lottery-style game with multiple betting modes

Each game type has its own logic, UI components, and database schema.

### 3.4 Wallet System

The wallet system handles:

- **Deposits**: Players can request deposits through UPI or bank transfer
- **Withdrawals**: Players can request balance withdrawals
- **Approval Flow**: Admins approve/reject withdrawal requests
- **Transaction History**: Complete record of all financial transactions

### 3.5 Admin Dashboard

The admin dashboard provides:

- **Game Management**: Create, update, and manage game instances
- **User Management**: Manage users, subadmins, and player accounts
- **Financial Controls**: Process deposits and withdrawals
- **Risk Management**: Monitor betting patterns and system exposure
- **Settings**: Configure system settings, payment details, and UI elements

## 4. Data Flow

### 4.1 User Registration and Authentication

1. User registers with username/password
2. Credentials are validated and stored with hashed password
3. On login, credentials are verified against database
4. On successful authentication, a session is created and stored in PostgreSQL
5. Session ID is stored in a cookie on the client

### 4.2 Game Flow

1. User selects a game and places a bet
2. Backend validates the bet against user balance
3. Game result is determined (either immediately or after a scheduled event)
4. User balance is updated based on the outcome
5. Game history is updated for audit purposes

### 4.3 Financial Flow

1. User requests deposit/withdrawal
2. Admin/subadmin reviews and processes the request
3. On approval, user balance is updated
4. Transaction is recorded in the database
5. User receives notification of the completed transaction

## 5. External Dependencies

### 5.1 Frontend Dependencies

- **React**: Core UI library
- **TanStack Query**: Data fetching and cache management
- **Shadcn/UI**: UI component library built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework
- **Wouter**: Lightweight routing library
- **date-fns**: Date manipulation library
- **react-hook-form**: Form validation and handling
- **zod**: Schema validation
- **Lucide React**: Icon library

### 5.2 Backend Dependencies

- **Express**: Web server framework
- **Drizzle ORM**: Database ORM for PostgreSQL
- **@neondatabase/serverless**: Neon PostgreSQL client
- **Passport.js**: Authentication middleware
- **bcrypt**: Password hashing
- **multer**: File upload handling
- **connect-pg-simple**: PostgreSQL session store

## 6. Deployment Strategy

The application is set up for deployment on Replit with the following configuration:

- **Build Process**: Uses Vite for frontend build and esbuild for backend bundling
- **Database**: Uses NeonDB (PostgreSQL) external database
- **Environment**: Node.js with TypeScript
- **Static Assets**: Built frontend assets are served by the Express server
- **Deployment Target**: Configured for autoscaling on Replit
- **Start Command**: `npm run start` to run the production build

### Environment Variables

Key environment variables include:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `NODE_ENV`: Environment (development/production)

## 7. Security Considerations

- **Password Security**: Passwords are hashed with bcrypt
- **Session Security**: Sessions are managed securely with proper timeout
- **Role-Based Access**: API endpoints are protected based on user roles
- **Input Validation**: All user inputs are validated using zod schemas
- **Secure Cookies**: HTTP-only cookies for session management

## 8. Development Workflow

- **TypeScript**: Used throughout the codebase for type safety
- **Schema Sharing**: Database schema is shared between frontend and backend
- **API Types**: API response types are defined in shared types
- **Development Mode**: Hot module replacement for rapid development
- **Database Migrations**: Using Drizzle Kit for schema migrations