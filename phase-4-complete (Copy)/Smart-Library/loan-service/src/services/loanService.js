require('dotenv').config();
const { Op } = require('sequelize');
const axios = require('axios');
const Loan = require('../models/loan');
const sequelize = require('../config/database');

class LoanService {
  async issueLoan(userId, bookId, dueDate) {
    try {
      // Verify book availability
      const bookResponse = await axios.get(`${process.env.BOOK_SERVICE_URL}/api/books/${bookId}`);
      const book = bookResponse.data;
      if (!book || book.available_copies < 1) {
        throw new Error('Book not available');
      }

      // Verify user exists
      const userResponse = await axios.get(`${process.env.USER_SERVICE_URL}/api/users/${userId}`);
      const user = userResponse.data;
      if (!user) {
        throw new Error('User not found');
      }

      const transaction = await sequelize.transaction();
      try {
        // Update book availability through book service
        await axios.post(`${process.env.BOOK_SERVICE_URL}/api/books/${bookId}/update-copies`, {
          change: -1
        });

        const loan = await Loan.create(
          {
            user_id: userId,
            book_id: bookId,
            due_date: dueDate,
          },
          { transaction }
        );

        await transaction.commit();
        return loan;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      throw new Error(error.response?.data?.error || error.message);
    }
  }

  async returnBook(loanId) {
    const loan = await Loan.findByPk(loanId);
    if (!loan || loan.status === 'RETURNED') {
      throw new Error('Invalid loan or already returned');
    }

    const transaction = await sequelize.transaction();
    try {
      // Update book availability through book service
      await axios.post(`${process.env.BOOK_SERVICE_URL}/api/books/${loan.book_id}/update-copies`, {
        change: 1
      });

      await loan.update(
        {
          status: 'RETURNED',
          return_date: new Date(),
        },
        { transaction }
      );

      await transaction.commit();
      return loan;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getUserLoans(userId) {
    const loans = await Loan.findAll({
      where: { user_id: userId }
    });

    // Enrich with book details
    const enrichedLoans = await Promise.all(
      loans.map(async (loan) => {
        try {
          const bookResponse = await axios.get(`${process.env.BOOK_SERVICE_URL}/api/books/${loan.book_id}`);
          const book = bookResponse.data;
          return {
            ...loan.toJSON(),
            book: book ? {
              id: book.id,
              title: book.title,
              author: book.author
            } : null
          };
        } catch (error) {
          console.error(`Error fetching book details for loan ${loan.id}:`, error);
          return loan.toJSON();
        }
      })
    );

    return enrichedLoans;
  }

  async getOverdueLoans() {
    const currentDate = new Date();
    const overdueLoans = await Loan.findAll({
      where: {
        status: 'ACTIVE',
        due_date: {
          [Op.lt]: currentDate
        }
      }
    });

    // Enrich with user and book details
    const enrichedLoans = await Promise.all(
      overdueLoans.map(async (loan) => {
        try {
          const [userResponse, bookResponse] = await Promise.all([
            axios.get(`${process.env.USER_SERVICE_URL}/api/users/${loan.user_id}`),
            axios.get(`${process.env.BOOK_SERVICE_URL}/api/books/${loan.book_id}`)
          ]);

          return {
            ...loan.toJSON(),
            days_overdue: Math.floor((currentDate - loan.due_date) / (1000 * 60 * 60 * 24)),
            user: userResponse.data ? {
              id: userResponse.data.id,
              name: userResponse.data.name,
              email: userResponse.data.email
            } : null,
            book: bookResponse.data ? {
              id: bookResponse.data.id,
              title: bookResponse.data.title,
              author: bookResponse.data.author
            } : null
          };
        } catch (error) {
          console.error(`Error fetching details for loan ${loan.id}:`, error);
          return loan.toJSON();
        }
      })
    );

    return enrichedLoans;
  }

  async getBookBorrowCounts(bookIds) {
    const stats = await Loan.findAll({
      attributes: [
        'book_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'borrow_count']
      ],
      where: {
        book_id: {
          [Op.in]: bookIds
        }
      },
      group: ['book_id']
    });

    return stats.reduce((acc, item) => {
      acc[item.book_id] = parseInt(item.get('borrow_count'));
      return acc;
    }, {});
  }

  async getUserBorrowStats(userIds) {
    const stats = await Loan.findAll({
      attributes: [
        'user_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_borrows'],
        [
          sequelize.fn('COUNT', 
            sequelize.literal("CASE WHEN status = 'ACTIVE' THEN 1 END")
          ),
          'active_borrows'
        ]
      ],
      where: {
        user_id: {
          [Op.in]: userIds
        }
      },
      group: ['user_id']
    });

    return stats.reduce((acc, item) => {
      acc[item.user_id] = {
        books_borrowed: parseInt(item.get('total_borrows')),
        current_borrows: parseInt(item.get('active_borrows'))
      };
      return acc;
    }, {});
  }

  async extendLoan(loanId, extensionDays) {
    const loan = await Loan.findByPk(loanId);
    if (!loan || loan.status !== 'ACTIVE') {
      throw new Error('Invalid loan or not active');
    }

    if (loan.extensions_count >= 2) {
      throw new Error('Maximum extensions reached');
    }

    const newDueDate = new Date(loan.due_date);
    newDueDate.setDate(newDueDate.getDate() + extensionDays);

    return await loan.update({
      due_date: newDueDate,
      extensions_count: loan.extensions_count + 1
    });
  }

  async getSystemOverview() {
    try {
      // Get statistics from book and user services
      const [bookResponse, userResponse] = await Promise.all([
        axios.get(`${process.env.BOOK_SERVICE_URL}/api/books/stats`),
        axios.get(`${process.env.USER_SERVICE_URL}/api/users/stats`)
      ]);

      const bookStats = bookResponse.data;
      const userStats = userResponse.data;

      // Get active loans count (books currently borrowed)
      const activeLoansCount = await Loan.count({
        where: { status: 'ACTIVE' }
      });

      // Get overdue loans count
      const overdueLoansCount = await Loan.count({
        where: {
          status: 'ACTIVE',
          due_date: {
            [Op.lt]: new Date()
          }
        }
      });

      // Calculate today's loans and returns
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const [loansToday, returnsToday] = await Promise.all([
        Loan.count({
          where: {
            issue_date: {
              [Op.between]: [todayStart, todayEnd]
            }
          }
        }),
        Loan.count({
          where: {
            return_date: {
              [Op.between]: [todayStart, todayEnd]
            }
          }
        })
      ]);

      return {
        total_books: bookStats.total || 0,
        total_users: userStats.total || 0,
        books_available: bookStats.available || 0,
        books_borrowed: activeLoansCount,
        overdue_loans: overdueLoansCount,
        loans_today: loansToday,
        returns_today: returnsToday
      };
    } catch (error) {
      console.error('Error fetching system overview:', error);
      return {
        total_books: 0,
        total_users: 0,
        books_available: 0,
        books_borrowed: 0,
        overdue_loans: 0,
        loans_today: 0,
        returns_today: 0
      };
    }
  }
}

module.exports = new LoanService();