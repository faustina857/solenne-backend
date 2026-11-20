const mongoose = require('mongoose');
const { MAX_CART_QUANTITY } = require('../../constants');

// No price is stored: everything shown is read live from the products (target-backend.md 8).
// `_id: false` because a line is identified by its sku, not by an id of its own.
const cartItemSchema = new mongoose.Schema({
    product: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true 
    },
    sku: { 
        type: String, 
        required: true 
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_CART_QUANTITY,
      validate: { validator: Number.isInteger, message: 'Quantity must be a whole number.' },
    },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema({
    // unique: true creates the index that guarantees one cart per user.
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        unique: true 
    },
    items: { 
        type: [cartItemSchema], 
        default: [] 
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Cart', cartSchema);