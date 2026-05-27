/**
 * Product Model
 * Collection: MagcoffDB → catalog_items
 *
 * Migrated from SmartTrolleyDB.Products (107 documents).
 * English names only for MVP.
 */

import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    // e.g. "product10" — kept from SmartTrolleyDB for traceability
    legacyProductId: {
      type:     String,
      required: false,
      trim:     true,
    },

    name: {
      type:     String,
      required: true,
      trim:     true,
    },

    price: {
      type:     Number,
      required: true,
      min:      0,
    },

    // Azure Blob Storage URL
    imageUrl: {
      type:     String,
      required: false,
      trim:     true,
    },

    // e.g. "Beverages", "Snacks", "Dairy"
    category: {
      type:     String,
      required: true,
      trim:     true,
    },

    // e.g. "224g", "1L"
    unit: {
      type:     String,
      required: false,
      trim:     true,
    },

    description: {
      type:     String,
      required: false,
      trim:     true,
    },

    // EAN-13 barcode — used when trolley scans a product
    barcode: {
      type:     String,
      required: false,
      trim:     true,
    },

    inStock: {
      type:    Boolean,
      default: true,
    },
  },
  {
    timestamps: false,
    collection: 'catalog_items',
  }
);

// Indexes
productSchema.index({ barcode:  1 });                        // trolley scan
productSchema.index({ category: 1 });                        // category filter
productSchema.index({ name: 'text', description: 'text' });  // search

const Product = mongoose.model('Product', productSchema);
export default Product;