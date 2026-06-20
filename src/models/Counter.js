/**
 * Counter Model
 * Collection: MagcoffDB → counters
 *
 * Generic atomic counter used to generate collision-free sequence numbers
 * (e.g. for daily order IDs). Each document is keyed by an arbitrary string
 * and incremented atomically via $inc, which Mongo guarantees is safe under
 * concurrent writes — unlike generating a random number client-side.
 */

import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema(
  {
    key:   { type: String, required: true, unique: true },
    value: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'counters',
  }
);

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
export default Counter;