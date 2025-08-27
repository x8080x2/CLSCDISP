# DocuBot Administration System

## Overview

This is a full-stack web application that provides an administrative interface for managing a Telegram delivery bot called "DocuBot". The system includes a React-based admin dashboard for managing orders, users, and transactions, along with a Node.js backend API and Telegram bot integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### August 27, 2025 - Successful Migration to Replit Environment
- **Environment Migration**: Successfully migrated DocuBot Administration System from Replit Agent to Replit environment
- **Database Setup**: Created and configured PostgreSQL database with proper schema synchronization
- **Security Improvements**: Implemented robust client/server separation and security practices
- **TypeScript Fixes**: Resolved all LSP diagnostics and type safety issues
- **API Functionality**: All REST API endpoints now working correctly with proper error handling
- **Development Ready**: Application is fully functional and ready for continued development

### July 13, 2025 - Enhanced Telegram Bot with File Upload Support
- **Telegram Order Placement**: Users can now place complete orders through Telegram bot with file uploads
- **Multi-Address Support**: Document orders support multiple delivery addresses (up to the document count)
- **File Upload System**: Customers can upload files for each delivery address via Telegram or web interface
- **Admin Notifications**: New orders and files are automatically sent to multiple Telegram admin IDs
- **Real-time Processing**: Orders placed via Telegram are immediately processed and notifications sent
- **Security**: File uploads are validated for type and size (10MB limit)

### July 13, 2025 - Separated Customer and Admin Interfaces
- **Customer Interface**: Created `/` route with customer-focused dashboard
- **Admin Interface**: Created `/admin/*` routes with admin-specific navigation and styling
- **Visual Distinction**: Admin portal uses red branding with Shield icons, customer uses blue branding with Send icons
- **Separate Components**: Admin sidebar, header, and pages are completely separate from customer interface
- **Security**: Admin portal clearly labeled and visually distinct to prevent customer access

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: Tailwind CSS for styling with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API endpoints
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Management**: Connect-pg-simple for PostgreSQL session storage
- **Bot Integration**: node-telegram-bot-api for Telegram bot functionality

### Database Design
- **Users**: Stores Telegram user information, balances, and account status
- **Orders**: Manages delivery orders with status tracking and pricing
- **Transactions**: Records all financial transactions (top-ups, payments, refunds)
- **Enums**: Predefined status types for orders, transactions, and service levels

## Key Components

### Database Schema
- **Users Table**: User profiles linked to Telegram accounts with balance tracking
- **Orders Table**: Comprehensive order management with pickup/delivery addresses, service types, and cost calculations
- **Transactions Table**: Financial transaction history with type classification
- **Relationships**: Proper foreign key relationships between users, orders, and transactions

### API Endpoints
- **Stats**: Dashboard metrics (total orders, active users, revenue, pending orders)
- **Users**: CRUD operations for user management and balance updates
- **Orders**: Order creation, status updates, and filtering capabilities
- **Transactions**: Transaction history and financial record management

### Frontend Pages

#### Customer Interface (/)
- **Customer Dashboard**: User-friendly view with personal orders, balance, and transaction history
- **Order Creation**: Simple interface for customers to create new orders
- **Balance Management**: Customer can top up their balance
- **Order Tracking**: View order status and history

#### Admin Interface (/admin/*)
- **Admin Dashboard**: Administrative overview with system metrics and recent activity
- **Orders Management**: Full order management with filtering and status updates
- **Users Management**: User administration with balance management
- **Transactions**: Financial transaction history and reporting
- **Visual Distinction**: Red branding with Shield icons to clearly indicate admin access

### Telegram Bot Features
- **User Registration**: Automatic account creation on first interaction
- **Service Pricing**: Multi-tier delivery service options (standard, express, same-day)
- **Order Management**: Complete order lifecycle through bot commands including file uploads
- **Multi-Address Orders**: Support for document orders with multiple delivery addresses
- **File Upload**: Direct file upload support for documents and photos via Telegram
- **Payment Processing**: Balance management and transaction handling
- **Admin Notifications**: Automatic order and file notifications to multiple admin IDs

## Data Flow

1. **User Registration**: Users interact with Telegram bot, accounts created automatically
2. **Order Creation**: Orders can be created via bot or admin interface
3. **Status Updates**: Admin can update order status, notifications sent via Telegram
4. **Financial Transactions**: Balance updates and payments processed through secure API
5. **Real-time Updates**: React Query ensures fresh data across admin interface

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM with PostgreSQL support
- **node-telegram-bot-api**: Telegram Bot API integration
- **@tanstack/react-query**: Server state management for React

### UI Components
- **@radix-ui/***: Accessible, unstyled UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Modern icon library
- **react-hook-form**: Performant form library with validation

### Development Tools
- **vite**: Fast build tool and development server
- **typescript**: Static type checking
- **tsx**: TypeScript execution for Node.js development

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds optimized React application to `dist/public`
- **Backend**: esbuild bundles Express server with external dependencies
- **Database**: Drizzle migrations handle schema changes

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **TELEGRAM_BOT_TOKEN**: Telegram bot authentication token
- **TELEGRAM_ADMIN_IDS**: Comma-separated list of Telegram admin IDs for notifications (e.g., "123456789,987654321")
- **NODE_ENV**: Environment-specific configuration

### Development Workflow
- **dev**: Development server with hot reloading using tsx
- **build**: Production build for both frontend and backend
- **start**: Production server startup
- **db:push**: Database schema synchronization

The application follows a monorepo structure with shared TypeScript types and schemas, enabling type safety across the entire stack. The modular architecture allows for easy scaling and maintenance of both the admin interface and bot functionality.