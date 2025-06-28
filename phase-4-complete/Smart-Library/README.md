# Smart Library System - Microservices Architecture

This project implements a library management system using a microservices architecture. The system is split into three main services:

1. Book Service (Port 3001) - Manages books and their availability
2. User Service (Port 3002) - Handles user management and user statistics
3. Loan Service (Port 3003) - Manages book loans, returns, and related statistics

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- NPM (v6 or higher)

## Database Setup

Each service uses its own database:
- book_service_db
- user_service_db
- loan_service_db

## Environment Variables

Each service has its own .env file with the following configuration:

### Book Service
```
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=1234
DB_NAME=book_service_db
DB_PORT=5432
PORT=3001
```

### User Service
```
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=1234
DB_NAME=user_service_db
DB_PORT=5432
PORT=3002
```

### Loan Service
```
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=1234
DB_NAME=loan_service_db
DB_PORT=5432
PORT=3003
```

## Quick Start

1. Make sure PostgreSQL is running
2. Run the start script:
   ```bash
   ./start-services.sh
   ```
   This will:
   - Create the necessary databases
   - Install dependencies for each service
   - Start all three services

Alternatively, you can start each service manually:

1. Book Service:
   ```bash
   cd book-service
   npm install
   npm run dev
   ```

2. User Service:
   ```bash
   cd user-service
   npm install
   npm run dev
   ```

3. Loan Service:
   ```bash
   cd loan-service
   npm install
   npm run dev
   ```

## API Endpoints

### Book Service (http://localhost:3001)
- POST /api/books - Create a new book
- GET /api/books - Search books
- GET /api/books/popular - Get popular books
- GET /api/books/:id - Get book by ID
- PUT /api/books/:id - Update book
- DELETE /api/books/:id - Delete book
- POST /api/books/:id/update-copies - Update available copies

### User Service (http://localhost:3002)
- POST /api/users - Create a new user
- GET /api/users/active - Get most active users
- GET /api/users/:id - Get user by ID
- PUT /api/users/:id - Update user

### Loan Service (http://localhost:3003)
- POST /api/loans - Issue a new loan
- POST /api/loans/returns - Return a book
- GET /api/loans/overdue - Get overdue loans
- GET /api/loans/stats/books - Get book borrow statistics
- GET /api/loans/stats/users - Get user borrow statistics
- GET /api/loans/:user_id - Get user's loans
- PUT /api/loans/:id/extend - Extend a loan

## Service Communication

The services communicate with each other via HTTP calls:
- Loan Service calls Book Service to check book availability and update copies
- Loan Service calls User Service to verify user existence
- Book Service calls Loan Service to get book borrow statistics
- User Service calls Loan Service to get user activity statistics