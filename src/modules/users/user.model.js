const mongoose = require('mongoose');
const { ROLES } = require('../../constants');

// Addresses keep their own _id: the API addresses them as /addresses/:id.
const addressSchema = new mongoose.Schema(
  {
    label: { 
        type: String, 
        trim: true 
    },
    fullName: { 
        type: String, 
        required: true, 
        trim: true 
    },
    phone: { 
        type: String, 
        required: true, 
        trim: true 
    },
    street: { 
        type: String, 
        required: true, 
        trim: true 
    },
    landmark: { 
        type: String, 
        trim: true 
    },
    city: { 
        type: String, 
        required: true, 
        trim: true 
    },
    state: { 
        type: String, 
        required: true, 
        trim: true 
    },
    isDefault: { 
        type: Boolean, 
        default: false 
    },
  },
  { timestamps: true },
);

const codeSchema = new mongoose.Schema(
  {
    hash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { _id: false },
);


const userSchema = new mongoose.Schema(
  {
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true 
    },
    password: { 
        type: String, 
        required: true, 
        select: false 
    },
    role: { 
        type: String, 
        enum: Object.values(ROLES), 
        default: ROLES.CUSTOMER 
    },
    phone: { 
        type: String, 
        trim: true 
    },
    emailVerified: { 
        type: Boolean, 
        default: false 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    passwordChangedAt: Date,
    emailVerification: { 
        type: codeSchema, 
        select: false
    },
    passwordReset: { 
        type: codeSchema, 
        select: false
    },
    passwordResetExpires: Date,
    addresses: [addressSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model('User', userSchema);
