const bookService = require('./book/bookService');
const userService = require('./user/userService');
const loanService = require('./loan/loanService');

// Set up service dependencies
loanService.setBookService(bookService);
loanService.setUserService(userService);

module.exports = {
  bookService,
  userService,
  loanService
};