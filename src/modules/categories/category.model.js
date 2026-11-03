const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true }
  },
  { _id: false}
);

const categorySchema = new mongoose.Schema({
    name:{
        type: String,
        required: true,
        trim: true
    },
    slug:{
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    //null means this is a main category; otherwise the id of it's main category.
    parent:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    image:{
        type: imageSchema,
        default: null
    },
    isActive:{
        type: Boolean,
        default: true
    },
    sortOrder:{
        type: Number,
        default: 0
    }
}, { timestamps: true });

categorySchema.index({ parent:1, name:1 }, {unique: true}); //unique name per parent
module.exports = mongoose.model('Category', categorySchema);