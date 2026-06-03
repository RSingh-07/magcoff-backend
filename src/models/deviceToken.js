// src/models/deviceToken.js
import mongoose from 'mongoose';

const deviceTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Platform: 'android' | 'ios'
    platform: {
      type: String,
      enum: ['android', 'ios'],
      required: true,
    },

    // The raw device token string from flutter_local_notifications / APNs
    token: {
      type: String,
      required: true,
      unique: true,   // one document per unique token
    },

    // Whether the user has notifications enabled
    enabled: {
      type: Boolean,
      default: true,
    },

    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Update lastSeen on every save
deviceTokenSchema.pre('save', function (next) {
  this.lastSeen = new Date();
  next();
});

export default mongoose.model('DeviceToken', deviceTokenSchema);