const mongoose = require('mongoose');
const { GENDERS } = require('../../constants');

// Defense in depth: Joi already checks these at the edge, the model checks again.
// null and undefined pass, so optional fields like compareAtPrice work.
const isWholeNumber = (value) => value == null || Number.isInteger(value);
const wholeNumber = (options) => ({
  type: Number,
  validate: { validator: isWholeNumber, message: '{PATH} must be a whole number.' },
  ...options,
});

const imageSchema = new mongoose.Schema(
  { url: { 
        type: String,
        required: true 
    }, 
    publicId: { 
        type: String, 
        required: true } },
  { _id: false },
);

// No price here: every variant sells at the product's price.
const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    stock: wholeNumber({ required: true, min: 0 }),
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true, trim: true },
    brand: { type: String, trim: true },
    brandSlug: { type: String, default: null },
    category: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Category', 
        required: true 
    },
    subCategory: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Category', 
        required: true 
    },
    gender: { type: String, enum: Object.values(GENDERS), required: true },
    images: { type: [imageSchema], default: [] },
    price: wholeNumber({ required: true, min: 1 }), // kobo
    compareAtPrice: wholeNumber({ min: 1, default: null }), // kobo, the "was" price
    variants: { type: [variantSchema], default: [] },
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.index({ name: 'text', description: 'text', brand: 'text' });
// A unique index on an array field is checked per element, so no two products share a SKU.
// It does not stop duplicates inside one product, so the service checks that too.
productSchema.index({ 'variants.sku': 1 }, { unique: true });
productSchema.index({ isActive: 1, gender: 1, category: 1, subCategory: 1 });
productSchema.index({ brandSlug: 1 });
productSchema.index({ price: 1 });

module.exports = mongoose.model('Product', productSchema);