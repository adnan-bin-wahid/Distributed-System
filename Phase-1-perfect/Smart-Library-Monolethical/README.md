# Smart Library System - Monolithic Version

A monolithic application for managing library operations including user management, book catalog, and loan tracking.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm (Node Package Manager)

## Setup

1. Create a PostgreSQL database named `smart_library`

```sql
CREATE DATABASE smart_library;
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Copy the .env.example file to .env and update the values according to your PostgreSQL configuration:

```
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=smart_library
DB_PORT=5432
PORT=3000
```

## Running the Application

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### User Management
- POST /api/users - Create a new user
- GET /api/users/:id - Get user details
- PUT /api/users/:id - Update user information
- GET /api/stats/users/active - Get most active users

### Book Management
- POST /api/books - Add a new book
- GET /api/books - Search books
- GET /api/books/:id - Get book details
- PUT /api/books/:id - Update book information
- DELETE /api/books/:id - Remove a book
- GET /api/stats/books/popular - Get popular books

### Loan Management
- POST /api/loans - Issue a book
- POST /api/returns - Return a book
- GET /api/loans/:user_id - Get user's loan history
- GET /api/loans/overdue - Get overdue loans
- PUT /api/loans/:id/extend - Extend loan period
- GET /api/stats/overview - Get system overview

## Architecture

The application follows a modular monolithic architecture with clear separation of concerns:

- `models/` - Database models using Sequelize ORM
- `services/` - Business logic implementation
- `routes/` - API endpoint definitions
- `config/` - Configuration files

Each module (User, Book, Loan) is designed to be independent, making it easier to convert to microservices in the future.