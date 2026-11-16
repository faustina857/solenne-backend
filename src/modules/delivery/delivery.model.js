const mongoose = require('mongoose');
const { NIGERIAN_STATES } = require('../../constants');

const deliveryZoneSchema = new mongoose.Schema(
  {
    state: { 
      type: String, 
      required: true, 
      enum: [...NIGERIAN_STATES] 
    },
    // The admin's spelling, shown to customers.
    city: { 
      type: String, 
      required: true, 
      trim: true 
    },
    // Lowercase copy used only for matching. The unique index below uses it.
    cityKey: { 
      type: String, 
      required: true 
    },
    // Integer kobo. 0 is allowed (free delivery).
    fee: { 
      type: Number, 
      required: true, 
      min: 0, 
      validate: Number.isInteger 
    },
    estimatedDays: { 
      type: String, 
      trim: true, 
      default: null 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
  },
  { timestamps: true },
);

// The database decides duplicates, so two admins saving the same city at the same moment
// can't create twins (a "check first, then save" would miss that).
deliveryZoneSchema.index({ state: 1, cityKey: 1 }, { unique: true });

module.exports = mongoose.model('DeliveryZone', deliveryZoneSchema);