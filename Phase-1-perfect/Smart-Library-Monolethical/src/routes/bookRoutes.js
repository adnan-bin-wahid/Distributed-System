const express = require('express');
const router = express.Router();
const { bookService } = require('../services');

router.post('/books', async (req, res) => {
  try {
    const book = await bookService.createBook(req.body);
    res.status(201).json(book);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/books', async (req, res) => {
  try {
    const books = await bookService.searchBooks(req.query.search || '');
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/books/popular', async (req, res) => {
  try {
    const popularBooks = await bookService.getPopularBooks();
    res.json(popularBooks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/books/:id', async (req, res) => {
  try {
    const book = await bookService.getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/books/:id', async (req, res) => {
  try {
    const book = await bookService.updateBook(req.params.id, req.body);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/books/:id', async (req, res) => {
  try {
    const success = await bookService.deleteBook(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;