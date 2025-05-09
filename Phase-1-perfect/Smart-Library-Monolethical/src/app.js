const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');

// Import models for associations
const User = require('./models/user');
const Book = require('./models/book');
const Loan = require('./models/loan');

// Define model associations with explicit foreign keys
User.hasMany(Loan, {
  foreignKey: 'user_id',
  as: 'Loans',
  onDelete: 'CASCADE'
});

Loan.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'User'
});

Book.hasMany(Loan, {
  foreignKey: 'book_id',
  as: 'Loans',
  onDelete: 'CASCADE'
});

Loan.belongsTo(Book, {
  foreignKey: 'book_id',
  as: 'Book'
});

// Initialize services first
require('./services');

const app = express();

app.use(cors());
app.use(express.json());

// Import routes after services are initialized
const userRoutes = require('./routes/userRoutes');
const bookRoutes = require('./routes/bookRoutes');
const loanRoutes = require('./routes/loanRoutes');

// API routes
app.use('/api', userRoutes);
app.use('/api', bookRoutes);
app.use('/api', loanRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;

// Database synchronization and server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Force sync all models with proper order
    await sequelize.sync({ force: true, alter: true });
    console.log('Database synchronized successfully.');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start the server:', error);
    process.exit(1);
  }
};

startServer();