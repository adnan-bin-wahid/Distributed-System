const { Op } = require('sequelize');
const Book = require('../../models/book');
const sequelize = require('../../config/database');
const loanService = require('../loan/loanService');

class BookService {
  async createBook(bookData) {
    return await Book.create(bookData);
  }

  async getBookById(id) {
    return await Book.findByPk(id);
  }

  async updateBook(id, bookData) {
    const book = await Book.findByPk(id);
    if (!book) return null;
    return await book.update(bookData);
  }

  async deleteBook(id) {
    const book = await Book.findByPk(id);
    if (!book) return false;
    await book.destroy();
    return true;
  }

  async searchBooks(query) {
    return await Book.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.iLike]: `%${query}%` } },
          { author: { [Op.iLike]: `%${query}%` } },
          { isbn: { [Op.iLike]: `%${query}%` } }
        ]
      }
    });
  }

  // New methods needed by LoanService
  async updateBookCopies(bookId, change, transaction = null) {
    const book = await Book.findByPk(bookId, { transaction });
    if (!book) {
      throw new Error('Book not found');
    }
    
    return await book.update(
      { available_copies: book.available_copies + change },
      { transaction }
    );
  }

  async getTotalBooks() {
    return await Book.count();
  }

  async getAvailableBooksCount() {
    return await Book.sum('available_copies');
  }

  async getPopularBooks() {
    const books = await Book.findAll({
      attributes: [
        'id',
        'title',
        'author'
      ],
      limit: 10
    });

    const bookIds = books.map(book => book.id);
    const borrowCounts = await loanService.getBookBorrowCounts(bookIds);

    const booksWithCounts = books.map(book => ({
      ...book.toJSON(),
      borrow_count: borrowCounts[book.id] || 0
    }));

    return booksWithCounts.sort((a, b) => b.borrow_count - a.borrow_count);
  }
}

module.exports = new BookService();