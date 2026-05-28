require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const redis = require('../config/redis');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  // Clear rate limiter, brute-force, blacklist and idempotency keys so
  // successive logins in different tests don't hit the 5-attempt limit.
  try {
    const patterns = ['rl_*', 'bf:*', 'blacklist:*', 'idem:*'];
    for (const pattern of patterns) {
      const [, keys] = await redis.scan(0, 'MATCH', pattern, 'COUNT', 200);
      if (keys.length) await redis.del(...keys);
    }
  } catch {}
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
  redis.disconnect();
});
