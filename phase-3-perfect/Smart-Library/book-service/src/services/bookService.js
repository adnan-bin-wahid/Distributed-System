const { Op } = require('sequelize');
const axios = require('axios');
const Book = require('../models/book');
const sequelize = require('../config/database');

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
        'author',
        'available_copies'
      ],
      limit: 10
    });

    try {
      // Get borrow counts from loan service
      const response = await axios.get(`${process.env.LOAN_SERVICE_URL}/api/loans/stats/books`, {
        params: { bookIds: books.map(book => book.id) }
      });

      const borrowCounts = response.data;
      const booksWithCounts = books.map(book => ({
        ...book.toJSON(),
        borrow_count: borrowCounts[book.id] || 0
      }));

      return booksWithCounts.sort((a, b) => b.borrow_count - a.borrow_count);
    } catch (error) {
      console.error('Error fetching borrow counts:', error);
      return books;
    }
  }

  async getStats() {
    const [totalBooks, availableBooks] = await Promise.all([
      Book.count(),
      Book.sum('available_copies')
    ]);

    return {
      total: totalBooks,
      available: availableBooks || 0
    };
  }
}

module.exports = new BookService();