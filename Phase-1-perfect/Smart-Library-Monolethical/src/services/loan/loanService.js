const { Op } = require('sequelize');
const Loan = require('../../models/loan');
const sequelize = require('../../config/database');

class LoanService {
  constructor(bookService = null, userService = null) {
    this.bookService = bookService;
    this.userService = userService;
  }

  setBookService(bookService) {
    this.bookService = bookService;
  }

  setUserService(userService) {
    this.userService = userService;
  }

  async issueLoan(userId, bookId, dueDate) {
    // First verify the book is available using bookService
    const book = await this.bookService.getBookById(bookId);
    if (!book || book.available_copies < 1) {
      throw new Error('Book not available');
    }

    // Verify user exists
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const transaction = await sequelize.transaction();
    try {
      // Update book availability through bookService
      await this.bookService.updateBookCopies(bookId, -1, transaction);

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
  }

  async returnBook(loanId) {
    const loan = await Loan.findByPk(loanId);
    if (!loan || loan.status === 'RETURNED') {
      throw new Error('Invalid loan or already returned');
    }

    const transaction = await sequelize.transaction();
    try {
      // Update book availability through bookService
      await this.bookService.updateBookCopies(loan.book_id, 1, transaction);

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

    // Get book details through bookService
    const enrichedLoans = await Promise.all(
      loans.map(async (loan) => {
        const book = await this.bookService.getBookById(loan.book_id);
        return {
          ...loan.toJSON(),
          book: book ? {
            id: book.id,
            title: book.title,
            author: book.author
          } : null
        };
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

    // Enrich with user and book details through their respective services
    const enrichedLoans = await Promise.all(
      overdueLoans.map(async (loan) => {
        const [user, book] = await Promise.all([
          this.userService.getUserById(loan.user_id),
          this.bookService.getBookById(loan.book_id)
        ]);

        return {
          ...loan.toJSON(),
          days_overdue: Math.floor((currentDate - loan.due_date) / (1000 * 60 * 60 * 24)),
          user: user ? {
            id: user.id,
            name: user.name,
            email: user.email
          } : null,
          book: book ? {
            id: book.id,
            title: book.title,
            author: book.author
          } : null
        };
      })
    );

    return enrichedLoans;
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
    const [totalBooks, totalUsers] = await Promise.all([
      this.bookService.getTotalBooks(),
      this.userService.getTotalUsers()
    ]);

    const booksAvailable = await this.bookService.getAvailableBooksCount();
    const activeLoansCount = await Loan.count({
      where: { status: 'ACTIVE' }
    });

    const overdueLoansCount = await Loan.count({
      where: {
        status: 'ACTIVE',
        due_date: {
          [Op.lt]: new Date()
        }
      }
    });

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
      total_books: totalBooks,
      total_users: totalUsers,
      books_available: booksAvailable,
      books_borrowed: activeLoansCount,
      overdue_loans: overdueLoansCount,
      loans_today: loansToday,
      returns_today: returnsToday
    };
  }

  // New methods to support BookService and UserService
  async getBookBorrowCounts(bookIds) {
    const counts = await Loan.findAll({
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

    return counts.reduce((acc, item) => {
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
}

// Create a singleton instance
const loanService = new LoanService();
module.exports = loanService;