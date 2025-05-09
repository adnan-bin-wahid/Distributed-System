const User = require('../../models/user');
const sequelize = require('../../config/database');
const loanService = require('../loan/loanService');

class UserService {
  async createUser(userData) {
    return await User.create(userData);
  }

  async getUserById(id) {
    return await User.findByPk(id);
  }

  async updateUser(id, userData) {
    const user = await User.findByPk(id);
    if (!user) return null;
    return await user.update(userData);
  }

  async getTotalUsers() {
    return await User.count();
  }

  async getMostActiveUsers() {
    const users = await User.findAll({
      attributes: [
        'id',
        'name',
        'email'
      ],
      limit: 10
    });

    const userIds = users.map(user => user.id);
    const borrowStats = await loanService.getUserBorrowStats(userIds);

    const usersWithStats = users.map(user => ({
      ...user.toJSON(),
      books_borrowed: borrowStats[user.id]?.books_borrowed || 0,
      current_borrows: borrowStats[user.id]?.current_borrows || 0
    }));

    return usersWithStats.sort((a, b) => b.books_borrowed - a.books_borrowed);
  }
}

module.exports = new UserService();