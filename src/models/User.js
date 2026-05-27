import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    // Azure AD B2C object ID — primary identifier for B2C users
    azureId: {
      type:   String,
      unique: true,
      sparse: true, // allows null for old phone-based users
      trim:   true,
    },

    // E.164 Indian mobile — used by deprecated register/login only
    phone: {
      type:  String,
      trim:  true,
      match: [/^\+91\d{10}$/, 'phone must be in E.164 format: +91XXXXXXXXXX'],
      // ← removed required:true so B2C users don't need it
    },

    name: {
      type:     String,
      required: true,
      trim:     true,
    },

    email: {
      type:      String,
      trim:      true,
      lowercase: true,
    },

    // bcrypt hashed — only for deprecated local auth
    password: {
      type:   String,
      select: false,
      // ← removed required:true
    },
  },
  {
    timestamps: true,   // adds createdAt + updatedAt automatically
    collection: 'users',
  }
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => { delete ret.password; return ret; },
});

const User = mongoose.model('User', userSchema);
export default User;