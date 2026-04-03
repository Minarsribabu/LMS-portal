require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://lms-mongo:27017/lms';

async function seedAdmin(options = {}) {
  const {
    connect = true,
    disconnect = true,
    exitOnComplete = true,
  } = options;

  try {
    if (connect && mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
      console.log('Connected to MongoDB');
    }

    // Check if any admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });

    if (existingAdmin) {
      console.log('Admin already exists');
      if (disconnect && connect && mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
      }
      if (exitOnComplete) {
        process.exit(0);
      }
      return 'exists';
    }

    // Create default admin
    const adminData = {
      name: 'Super Admin',
      email: 'admin@lms.com',
      password: 'admin123', // Will be hashed by the User schema
      role: 'admin',
    };

    const newAdmin = new User(adminData);
    await newAdmin.save();

    console.log('Admin created');

    if (disconnect && connect && mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    if (exitOnComplete) {
      process.exit(0);
    }
    return 'created';
  } catch (error) {
    console.error('Error seeding admin:', error.message);
    if (exitOnComplete) {
      process.exit(1);
    }
    throw error;
  }
}

// Run seed if this is executed directly
if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin;
