import mongoose from 'mongoose';

const ambulanceSchema = new mongoose.Schema({
  driverName: { type: String, required: true },
  phone: { type: String, required: true },
  plateNumber: { type: String, required: true },
  hospitalName: { type: String },
  type: { type: String, enum: ['ICU', 'AC', 'Non-AC', 'Freezer'], default: 'Non-AC' },
  status: { type: String, enum: ['Active', 'Busy', 'On the Way'], default: 'Active' },
  
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true } // [Longitude, Latitude]
  },
  
  rating: { type: Number, default: 0 }
}, { timestamps: true });

// Create Geospatial Index for "Find Near Me"
ambulanceSchema.index({ location: '2dsphere' });

export const Ambulance = mongoose.model('Ambulance', ambulanceSchema);