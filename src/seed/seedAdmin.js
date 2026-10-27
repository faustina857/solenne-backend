const bcrypt = require('bcrypt');
const env = require('../config/env');
const logger = require('../config/logger');
const { connectDb, disconnectDb } = require('../config/db');
const User = require('../modules/users/user.model');
const { ROLES, BCRYPT_COST } = require('../constants');

const seedAdmin = async () => {
  if (!env.admin.email || !env.admin.password) {
    logger.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running this script.');
    process.exitCode = 1;
    return;
  }

  const email = env.admin.email.toLowerCase();
  // Builds the unique email index first, so the upsert below can't create a duplicate.
  await User.init();

  // $setOnInsert only applies when the admin is being created, so running this twice
  // never overwrites a password you changed later (safe to repeat).
  const result = await User.updateOne(
    { email },
    {
      $setOnInsert: {
        name: 'Solenne Admin',
        password: await bcrypt.hash(env.admin.password, BCRYPT_COST),
        role: ROLES.ADMIN,
        emailVerified: true,
      },
    },
    { upsert: true },
  );
  logger.info(result.upsertedCount ? 'Admin created.' : 'Admin already exists. Nothing changed.');
};

const run = async () => {
  await connectDb();
  try {
    await seedAdmin();
  } finally {
    await disconnectDb();
  }
};

run().catch((err) => {
  logger.error({ err }, 'Admin seed failed');
  process.exit(1);
});