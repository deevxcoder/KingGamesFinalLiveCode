# Sports Betting Platform - Product Requirements Document (PRD)

## Project Overview

A sophisticated sports betting platform specializing in interactive number betting and multi-game experiences with advanced mobile-optimized gaming interfaces. The platform delivers a comprehensive betting ecosystem with intelligent user engagement, dynamic game presentations, and seamless multi-game interactions.

## Technical Stack

- **Frontend**: React with TypeScript, Vite build system
- **UI Framework**: Shadcn/ui components with Tailwind CSS
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based with Passport.js
- **File Uploads**: Multer middleware
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter for client-side routing
- **Mobile-First**: Responsive design optimized for mobile devices

## User Roles & Permissions

### 1. Admin (Super Administrator)
- Full platform control and oversight
- User management (create/manage subadmins and players)
- Financial management (deposits, withdrawals, balance management)
- Game management (create games, set results, manage odds)
- Platform settings (payment methods, commission rates, game odds)
- Risk management and monitoring
- Content management (sliders, game cards)
- Complete transaction history and audit trails

### 2. Subadmin (Regional Administrator)
- Manage assigned players within their network
- Handle player deposits and withdrawals
- Monitor player activities and game performance
- Access to assigned player transaction history
- Limited game management capabilities
- Commission-based earnings structure

### 3. Player (End User)
- Place bets on available games
- Manage wallet (view balance, deposit/withdraw funds)
- View game history and transaction records
- Access live game results
- Mobile-optimized gaming interface

## Core Features

### 1. Authentication System
- **Multi-role login system** with role-based access control
- **Session management** with secure authentication
- **Password security** using crypto.scrypt hashing
- **Account blocking/unblocking** functionality
- **Role-based dashboard redirection**

### 2. Game Types

#### A. Royal Toss (Coin Flip)
- **Simple binary betting** (Heads/Tails)
- **Configurable odds** and win multipliers
- **Real-time game creation** and result declaration
- **Mobile-optimized interface** with intuitive controls

#### B. Satamatka Games
- **Multiple betting modes**:
  - Jodi (00-99 number pairs)
  - Harf (single digit)
  - Crossing (number combinations)
  - Odd-Even betting
- **Market-based system** with open/close times
- **Complex result calculation** logic
- **Historical result tracking**

#### C. Cricket Toss
- **Cricket match simulation** betting
- **Team-based betting options**
- **Match scheduling** and result management

#### D. Team Match Sports
- **Multi-sport betting** platform
- **Team vs team betting**
- **Match scheduling** and management
- **Sports-specific odds** configuration

### 3. Financial Management

#### Wallet System
- **Multi-currency support** (INR with paisa precision)
- **Real-time balance tracking**
- **Transaction history** with detailed records
- **Deposit/withdrawal** functionality
- **Commission calculation** for subadmin transactions

#### Payment Methods
- **UPI Integration** (multiple UPI IDs support)
- **QR Code payments**
- **Bank transfer** support
- **Payment method configuration** by admin

#### Risk Management
- **Bet amount limits** and validation
- **Balance verification** before bet placement
- **Automatic profit/loss** calculation
- **Commission tracking** and distribution

### 4. Admin Dashboard

#### Analytics & Reports
- **Real-time statistics** dashboard
- **Profit/loss tracking** across all games
- **User activity monitoring**
- **Financial summaries** and reports
- **Game performance analytics**

#### User Management
- **Create and manage** subadmins and players
- **Assign players** to subadmins
- **Block/unblock** user accounts
- **Balance management** for all users
- **Transaction history** for all users

#### Game Management
- **Create games** across all supported types
- **Set game results** and process payouts
- **Configure game odds** and multipliers
- **Manage game schedules** and timing
- **Market creation** for Satamatka games

#### Settings Management
- **Platform-wide odds** configuration
- **Commission rate** settings
- **Payment method** configuration
- **Slider and banner** management
- **Game card** customization

### 5. Mobile Optimization

#### Responsive Design
- **Mobile-first approach** with touch-friendly interfaces
- **Optimized tab navigation** with horizontal scrolling
- **Card-based layouts** for easy mobile interaction
- **Gesture support** for navigation
- **Progressive enhancement** for larger screens

#### Performance
- **Fast loading times** with optimized assets
- **Efficient API calls** with caching
- **Real-time updates** without page refreshes
- **Offline-ready** design patterns

### 6. Content Management

#### Visual Assets
- **Hero slider management** for home page
- **Game card customization** with image uploads
- **Banner management** system
- **File upload system** with validation

#### Game Configuration
- **Dynamic odds** configuration
- **Game timing** and scheduling
- **Result templates** and automation
- **Market timing** management

## Technical Architecture

### Database Schema
- **Users table** with role-based access
- **Games tables** for different game types
- **Transactions table** for financial records
- **Markets table** for Satamatka games
- **Settings tables** for configuration
- **File uploads** for content management

### API Design
- **RESTful endpoints** for all operations
- **Role-based access control** middleware
- **Input validation** with Zod schemas
- **Error handling** and logging
- **File upload endpoints** for media

### Security Features
- **SQL injection prevention** with parameterized queries
- **XSS protection** with input sanitization
- **CSRF protection** with secure sessions
- **File upload validation** and sanitization
- **Rate limiting** for API endpoints

## Development Phases

### Phase 1: Foundation (Completed)
- ✅ User authentication and role management
- ✅ Basic game types implementation
- ✅ Wallet system and transactions
- ✅ Admin dashboard core features
- ✅ Mobile-responsive design

### Phase 2: Game Enhancement (Completed)
- ✅ Advanced Satamatka features
- ✅ Royal Toss optimization
- ✅ Cricket and team match games
- ✅ Result calculation algorithms
- ✅ Real-time game updates

### Phase 3: Platform Management (Completed)
- ✅ Comprehensive admin tools
- ✅ Financial management system
- ✅ Risk management features
- ✅ Content management system
- ✅ Settings and configuration

### Phase 4: Mobile Optimization (Completed)
- ✅ Mobile-first design implementation
- ✅ Touch-friendly interfaces
- ✅ Responsive tab navigation
- ✅ Performance optimization
- ✅ Cross-device compatibility

## Key Business Logic

### Betting System
- **Pre-bet validation** (balance, game status, bet limits)
- **Real-time odds** calculation
- **Automatic payout** processing
- **Win/loss determination** algorithms
- **Commission distribution** logic

### Financial Flows
- **Admin-to-subadmin** transfers with commission
- **Subadmin-to-player** fund management
- **Game winnings** distribution
- **Commission calculation** and tracking
- **Balance reconciliation** processes

### Game Life Cycles
- **Game creation** → **Betting period** → **Result declaration** → **Payout processing**
- **Market scheduling** for time-based games
- **Automatic game closure** at specified times
- **Result validation** and audit trails

## Quality Assurance

### Testing Coverage
- **Unit tests** for business logic
- **Integration tests** for API endpoints
- **End-to-end tests** for user workflows
- **Mobile testing** across devices
- **Performance testing** under load

### Security Audits
- **Authentication security** validation
- **Financial transaction** integrity
- **Data privacy** compliance
- **File upload security** testing
- **API security** assessment

## Deployment & Operations

### Environment Setup
- **Production-ready** configuration
- **Database migrations** with Drizzle
- **Environment variables** management
- **File storage** configuration
- **Monitoring and logging** setup

### Maintenance
- **Database backup** strategies
- **Performance monitoring**
- **Security updates** and patches
- **Feature updates** and enhancements
- **User support** and documentation

## Future Enhancements

### Potential Features
- **Real-time notifications** for game updates
- **Advanced analytics** and reporting
- **Mobile app** development
- **Multi-language** support
- **Advanced risk management** tools
- **API integration** with external sports data
- **Automated market making** features
- **Social features** and leaderboards

---

## Project Status: **PRODUCTION READY**

This platform represents a complete, full-featured sports betting system with robust financial management, comprehensive game support, and enterprise-grade security features. The codebase is production-ready with proper error handling, mobile optimization, and scalable architecture.