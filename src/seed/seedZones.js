const DeliveryZone = require('../modules/delivery/delivery.model');
const { normalize } = require('../modules/delivery/delivery.service');
const { connectDb, disconnectDb } = require('../config/db');
const logger = require('../config/logger');

// EDIT THESE before running. One row per city. Fees are integer kobo (₦1,500 = 150000).
const STARTING_ZONES = [
  { state: 'Lagos', city: 'Lekki', fee: 150000, estimatedDays: '2-4 days' },
  { state: 'Lagos', city: 'Ikeja', fee: 200000, estimatedDays: '2-4 days' },
];

const run = async () => {
  await connectDb();
  // One bulk call, not a loop of awaits. The filter finds the city; $setOnInsert only fills a
  // city that is missing, so running this twice never overwrites fees the admin changed.
  const result = await DeliveryZone.bulkWrite(
    STARTING_ZONES.map(({ state, city, ...rest }) => ({
      updateOne: {
        filter: { state, cityKey: normalize(city) },
        update: { $setOnInsert: { city, isActive: true, ...rest } },
        upsert: true,
      },
    })),
  );
  logger.info({ created: result.upsertedCount }, 'Delivery zones seeded.');
};

run()
  .catch((error) => {
    logger.error(error, 'Seeding delivery zones failed.');
    process.exitCode = 1;
  })
  .finally(disconnectDb);