#!/bin/bash

# Create the databases
echo "Creating databases..."
psql -U postgres -c "CREATE DATABASE book_service_db;"
psql -U postgres -c "CREATE DATABASE user_service_db;"
psql -U postgres -c "CREATE DATABASE loan_service_db;"

# Start all services in separate terminals
echo "Starting Book Service..."
cd book-service && npm install && npm run dev &

echo "Starting User Service..."
cd ../user-service && npm install && npm run dev &

echo "Starting Loan Service..."
cd ../loan-service && npm install && npm run dev &

# Wait for all background processes
wait