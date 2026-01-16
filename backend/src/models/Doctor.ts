import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  specialization: { type: String, required: true },
  subSpecialization: { type: String },
  hospital: { type: String, required: true }, // Or ref to Hospital model
  bmdcNumber: { type: String, required: true, unique: true },
  experienceYears: { type: Number, default: 0 },
  degrees: [{ type: String }],
  languages: [{ type: String }],
  
  education: [{
    degree: String,
    institute: String
  }],

  fees: {
    online: { type: Number, default: 0 },
    physical: { type: Number, default: 0 }
  },

  available: { type: Boolean, default: true },
  isTelemedicineAvailable: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  
  rating: { type: Number, default: 0 },
  reviews: [{
    patientName: String,
    rating: Number,
    comment: String,
    date: Date
  }],

  location: { type: String },
  status: { type: String, enum: ['Active', 'Inactive', 'On Leave'], default: 'Active' }
}, { timestamps: true });

export const Doctor = mongoose.model('Doctor', doctorSchema);