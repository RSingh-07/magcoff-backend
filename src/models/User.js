import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    azureId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [
        /^\+91\d{10}$/,
        'phone must be in E.164 format: +91XXXXXXXXXX',
      ],
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);
export default User;