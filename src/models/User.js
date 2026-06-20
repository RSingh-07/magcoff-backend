import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// User Schema
//
// BUG FIX: Changed primary key from 'azureId' to '_id' (oid/sub from token)
// This is more stable across multiple auth providers (Microsoft, Google,
// Apple, Facebook) when using Entra federation.
//
// IMPORTANT: Always query by oid/sub, NEVER by email.
// Email is profile data and can change or vary across providers.
// ─────────────────────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    // ── Primary Key: Entra's stable user ID ─────────────────────────────
    // This is the 'oid' or 'sub' claim from the JWT token
    // _id is automatically indexed in MongoDB
    _id: {
      type: String,
      required: true,
      // e.g., "12345678-1234-1234-1234-123456789012"
    },

    // ── Core User Info ──────────────────────────────────────────────────
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      // NOTE: Email is NOT unique or indexed as primary key
      // because it can vary across providers or change.
      // Use _id (oid) for all queries instead.
    },

    phone: {
      type: String,
      trim: true,
      // Match E.164 format: +91XXXXXXXXXX (for Indian numbers)
      // This can be empty initially if user hasn't updated profile
      match: [
        /^(\+91\d{10})?$/,
        'Phone must be in E.164 format: +91XXXXXXXXXX',
      ],
    },

    // ── Auth Provider Info ──────────────────────────────────────────────
    // Track which provider the user signed in with (for analytics)
    provider: {
      type: String,
      enum: ['entra', 'google', 'apple', 'facebook', 'email-otp'],
      default: 'entra',
    },

    // ── Registration Status ─────────────────────────────────────────────
    // Track if user has completed full registration flow
    registrationComplete: {
      type: Boolean,
      default: false,
    },

    // ── Profile Fields ──────────────────────────────────────────────────
    // These are optional and filled in during profile completion
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },

    // ── Preferences ─────────────────────────────────────────────────────
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'hi', 'mr'],
    },

    // ── Account Status ──────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
    },

    // ── Legacy Field (for migration) ────────────────────────────────────
    // If you had users stored by phone or email, map them during migration
    legacyPhoneKey: String,
    legacyEmailKey: String,
  },
  {
    timestamps: true,
    collection: 'users',
    // Exclude password from toJSON (if you ever add password field)
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        return ret;
      },
    },
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────────────────────────────────────

// _id is automatically indexed (primary key)
// Create index on email for lookups (but not unique)
userSchema.index({ email: 1 });

// Create index on phone for lookups
userSchema.index({ phone: 1 });

// Create index on provider for analytics
userSchema.index({ provider: 1 });

// Create index on createdAt for date-based queries
userSchema.index({ createdAt: 1 });

// ─────────────────────────────────────────────────────────────────────────────
// Query Helpers (IMPORTANT!)
// Always query by userId (oid), not by email
// ─────────────────────────────────────────────────────────────────────────────

// Find user by their stable ID (oid/sub)
userSchema.statics.findByUserId = function (userId) {
  return this.findById(userId);
};

// Find user by email (secondary lookup, not indexed for uniqueness)
// Use this only for display/profile lookups, not for auth decisions
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Find user by phone
userSchema.statics.findByPhone = function (phone) {
  return this.findOne({ phone });
};

// Create new user from token claims
userSchema.statics.createFromToken = function (decoded) {
  const userId = decoded.oid || decoded.sub;
  if (!userId) {
    throw new Error('No oid/sub claim in token');
  }

  return new this({
    _id: userId,
    name: decoded.name || 'User',
    email: decoded.email || decoded.preferred_username || null,
    provider: decoded.idp || 'entra',
    registrationComplete: false,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Example Usage
// ─────────────────────────────────────────────────────────────────────────────

/*
// In your auth route (POST /auth/verify-or-register):

const decoded = jwt.verify(token, ...);
const userId = decoded.oid || decoded.sub;

// ✅ CORRECT: Query by stable user ID
let user = await User.findByUserId(userId);

if (!user) {
  // Create new user from token claims
  user = User.createFromToken(decoded);
  await user.save();
}

// ❌ WRONG: Don't query by email as primary key
let user = await User.findByEmail(decoded.email);

// ✅ OK: Look up email for display (secondary lookup)
const existingEmail = await User.findByEmail(decoded.email);
if (existingEmail && existingEmail._id !== userId) {
  // Email already exists for different user
  // Handle account linking or error
}

*/

const User = mongoose.model('User', userSchema);
export default User;