/**
 * Coupon Seed Script
 * Run: node src/scripts/seedCoupons.js
 *
 * Seeds a small set of starter coupons into MagcoffDB.coupons so that
 * POST /cart/apply-coupon (fixed for Known Issue #5) has real, validatable
 * codes to test against instead of failing on every request against an
 * empty collection.
 *
 * Safe to run multiple times — uses upsert keyed on `code`, no duplicates.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Coupon   from '../models/Coupon.js';

const MAGCOFF_URI = process.env.MONGODB_URI;

const STARTER_COUPONS = [
  {
    code: 'SAVE10',
    discountPercent: 10,
    minOrderValue: 0,
    expiresAt: null,
    isActive: true,
  },
  {
    code: 'WELCOME15',
    discountPercent: 15,
    minOrderValue: 200,
    expiresAt: null,
    isActive: true,
  },
  {
    code: 'BIGCART20',
    discountPercent: 20,
    minOrderValue: 1000,
    expiresAt: null,
    isActive: true,
  },
];

async function seed() {
  console.log('🌱  Coupon Seed Script starting...\n');

  await mongoose.connect(MAGCOFF_URI);
  console.log('✅  Connected to MagcoffDB');

  let count = 0;
  for (const c of STARTER_COUPONS) {
    await Coupon.findOneAndUpdate(
      { code: c.code },
      c,
      { upsert: true, returnDocument: 'after' }
    );
    count += 1;
    console.log(`   • upserted coupon ${c.code} (${c.discountPercent}% off, min order ${c.minOrderValue})`);
  }

  console.log(`\n✅  Seed complete — ${count} coupons in MagcoffDB.coupons`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌  Coupon seed failed:', err.message);
  process.exit(1);
});