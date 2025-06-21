# Class Bank - Classroom Banking System

## Overview

Class Bank is a full-stack web application designed to simulate a banking system for classroom use. The application allows teachers to manage student accounts, distribute paychecks, and handle withdrawal requests, while students can view their balance, transaction history, and submit withdrawal requests. The system is built with a React frontend and Express backend, using PostgreSQL for data persistence and Replit Auth for authentication.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Shadcn/UI components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with role-based access control
- **Session Management**: Express sessions with PostgreSQL session store
- **Authentication**: Replit Auth with OpenID Connect

### Data Storage
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with TypeScript-first approach
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Neon serverless driver with WebSocket support

## Key Components

### Authentication System
- **Replit Auth Integration**: Uses OpenID Connect for secure authentication
- **Session Management**: Server-side sessions stored in PostgreSQL
- **Role-Based Access**: Distinguishes between 'student' and 'teacher' roles
- **Session Security**: HTTP-only cookies with secure settings

### Database Schema
- **Users Table**: Stores user profiles with role designation (mandatory for Replit Auth)
- **Sessions Table**: Session storage for authentication (mandatory for Replit Auth)
- **Accounts Table**: Student financial accounts with decimal balance precision
- **Transactions Table**: Complete transaction history with type classification
- **Withdrawal Requests Table**: Student withdrawal requests with approval workflow

### User Interfaces
- **Landing Page**: Authentication entry point with branded design
- **Student Dashboard**: Balance display, transaction history, withdrawal request form
- **Teacher Dashboard**: Student management, paycheck distribution, withdrawal approval system
- **Responsive Design**: Mobile-friendly interface with consistent theming

### API Endpoints
- **Authentication Routes**: User profile and session management
- **Student Operations**: Account balance, transaction history, withdrawal requests
- **Teacher Operations**: Student management, balance adjustments, paycheck distribution
- **Administrative Functions**: Statistics dashboard, withdrawal request approval

## Data Flow

### Authentication Flow
1. User accesses landing page and clicks login
2. Redirected to Replit Auth OpenID Connect provider
3. Upon successful authentication, user session created
4. User profile stored/updated in database
5. Client receives authenticated user data

### Student Workflow
1. Student views dashboard with current balance and recent transactions
2. Can submit withdrawal requests with amount and reason
3. Requests are queued for teacher approval
4. Transaction history updates automatically via React Query

### Teacher Workflow
1. Teacher views comprehensive dashboard with student statistics
2. Can distribute paychecks to all students simultaneously
3. Reviews and approves/rejects withdrawal requests
4. Can manually adjust individual student balances
5. Manages student accounts through administrative interface

## External Dependencies

### Authentication
- **Replit Auth**: Primary authentication provider
- **OpenID Client**: For OIDC protocol implementation
- **Passport.js**: Authentication middleware integration

### Database & ORM
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database operations
- **Drizzle Kit**: Schema management and migrations

### Frontend Libraries
- **React Query**: Server state management and caching
- **Wouter**: Lightweight client-side routing
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework

### Development Tools
- **Vite**: Fast development server and build tool
- **TSX**: TypeScript execution for development
- **ESBuild**: Production bundle optimization

## Deployment Strategy

### Replit Configuration
- **Modules**: Node.js 20, Web server, PostgreSQL 16
- **Development**: Runs on port 5000 with Vite dev server
- **Production**: Builds static assets and serves via Express
- **Auto-scaling**: Configured for Replit's autoscale deployment

### Build Process
1. **Development**: `npm run dev` starts Vite dev server with hot reloading
2. **Production Build**: 
   - Frontend: Vite builds optimized React bundle
   - Backend: ESBuild bundles Express server
   - Assets: Static files served from dist/public
3. **Database**: Drizzle migrations handle schema updates

### Environment Configuration
- **Database URL**: Required for PostgreSQL connection
- **Session Secret**: Required for secure session management
- **Replit Domains**: Required for authentication setup
- **Development vs Production**: Environment-specific configurations

## Changelog

```
Changelog:
- June 19, 2025. Initial setup complete - authentication working, student dashboard tested and approved
- June 19, 2025. Added Mini Economy features based on classroom form:
  * Quick Actions modal with preset rewards (Class Helper $10, Green Folder $5, etc.)
  * Quick fines (Talking Back $20, Removed from Class $50, Cheating/Fighting $100)
  * Monthly rent collection feature
  * New transaction types: reward, fine, rent
  * Lightning bolt quick action buttons for each student
- June 19, 2025. Added custom quick actions feature for teachers:
  * "My Actions" tab in Quick Actions modal
  * Teachers can create their own frequently used rewards and fines
  * Custom action management (create, use, delete)
  * Perfect for co-teacher collaboration - each can have their own custom actions
  * Four-tab interface: Rewards, Fines, My Actions, Custom amounts
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
Design preferences: Colorful, simple interface that appeals to fifth graders
Development approach: Iterative improvements based on classroom usage
Project goal: Build a classroom banking system for fifth graders that can be modified as needed
```