const User = require('../models/user');
const axios = require('axios');
const sequelize = require('../config/database');

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
        'email',
        'role'
      ],
      limit: 10
    });

    try {
      // Get borrow stats from loan service
      const response = await axios.get(`${process.env.LOAN_SERVICE_URL}/api/loans/stats/users`, {
        params: { userIds: users.map(user => user.id) }
      });

      const borrowStats = response.data;
      const usersWithStats = users.map(user => ({
        ...user.toJSON(),
        books_borrowed: borrowStats[user.id]?.books_borrowed || 0,
        current_borrows: borrowStats[user.id]?.current_borrows || 0
      }));

      return usersWithStats.sort((a, b) => b.books_borrowed - a.books_borrowed);
    } catch (error) {
      console.error('Error fetching borrow stats:', error);
      return users;
    }
  }

  async getStats() {
    const [totalUsers, usersByRole] = await Promise.all([
      User.count(),
      User.findAll({
        attributes: [
          'role',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['role']
      })
    ]);

    const roleStats = usersByRole.reduce((acc, item) => {
      acc[item.role] = parseInt(item.get('count'));
      return acc;
    }, {});

    return {
      total: totalUsers,
      by_role: roleStats
    };
  }
}

module.exports = new UserService();