const express = require('express');
const router = express.Router();
const { loanService } = require('../services');

router.post('/loans', async (req, res) => {
  try {
    const { user_id, book_id, due_date } = req.body;
    const loan = await loanService.issueLoan(user_id, book_id, due_date);
    res.status(201).json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/loans/returns', async (req, res) => {
  try {
    const { loan_id } = req.body;
    const loan = await loanService.returnBook(loan_id);
    res.json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Fixed route order: static routes before dynamic routes
router.get('/loans/overview', async (req, res) => {
  try {
    const overview = await loanService.getSystemOverview();
    res.json(overview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/loans/overdue', async (req, res) => {
  try {
    const overdueLoans = await loanService.getOverdueLoans();
    res.json(overdueLoans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/loans/:user_id', async (req, res) => {
  try {
    const loans = await loanService.getUserLoans(req.params.user_id);
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/loans/:id/extend', async (req, res) => {
  try {
    const { extension_days } = req.body;
    const loan = await loanService.extendLoan(req.params.id, extension_days);
    res.json(loan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;