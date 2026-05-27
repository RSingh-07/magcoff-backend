/**
 * Seed Script
 * Run: npm run seed
 *
 * Reads all 107 products from SmartTrolleyDB.Products
 * and writes them into MagcoffDB.catalog_items.
 * Safe to run multiple times — uses upsert, no duplicates.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Product  from '../models/Product.js';

const MAGCOFF_URI      = process.env.MONGODB_URI;
const SMARTTROLLEY_URI = process.env.MONGODB_URI.replace('/MagcoffDB?', '/SmartTrolleyDB?');

async function seed() {
  console.log('🌱  Magcoff Seed Script starting...\n');

  // Connect to MagcoffDB
  await mongoose.connect(MAGCOFF_URI);
  console.log('✅  Connected to MagcoffDB');

  // Connect to SmartTrolleyDB to read old products
  console.log('📦  Connecting to SmartTrolleyDB...');
  const stConn = await mongoose.createConnection(SMARTTROLLEY_URI).asPromise();
  console.log('✅  Connected to SmartTrolleyDB');

  const rawProducts = await stConn.collection('Products').find({}).toArray();
  console.log(`\n📦  Found ${rawProducts.length} products in SmartTrolleyDB.Products`);
  console.log('⏳  Migrating to MagcoffDB.catalog_items...\n');

  let count = 0;
  for (const p of rawProducts) {
    await Product.findOneAndUpdate(
      { legacyProductId: p.productId },
      {
        legacyProductId: p.productId    || null,
        name:            p.name,
        price:           p.price,
        imageUrl:        p.image        || null,
        category:        p.category     || 'General',
        unit:            p.weight ? `${p.weight}g` : null,
        description:     p.description  || null,
        barcode:         p.barcode      || null,
        inStock:         true,
      },
      { upsert: true, new: true }
    );
    count++;
  }

  console.log(`✅  Migration complete — ${count} products in MagcoffDB.catalog_items`);
  console.log('\n💡  Now run: npm run dev');

  await stConn.close();
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});