//!SECTION : SEED SCRIPT FOR INITIAL USERS

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User.model');
const logger = require('./src/config/logger');

const SALT_ROUNDS = 12;

const users = [
  {
    name: 'Admin User',
    email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@securelog.com',
    password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@1234',
    role: 'admin',
  },
  {
    name: 'Analyst User',
    email: 'analyst@securelog.com',
    password: 'Analyst@1234',
    role: 'analyst',
  },
  {
    name: 'Viewer User',
    email: 'viewer@securelog.com',
    password: 'Viewer@1234',
    role: 'viewer',
  },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  logger.info('Connected to DB for seeding');

  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) {
      const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);
      await User.create({ name: u.name, email: u.email, passwordHash, role: u.role });
      logger.info(`Created user: ${u.email}`);
    } else {
      logger.info(`User already exists, skipping: ${u.email}`);
    }
  }

  logger.info('Seeding complete');
  await mongoose.disconnect();
};

seed().catch((err) => {
  logger.error({ err }, 'Seeding failed');
  process.exit(1);
});
