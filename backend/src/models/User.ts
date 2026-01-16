import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  role: { 
    type: String, 
    enum: ['PATIENT', 'DOCTOR', 'ADMIN', 'SUPER_ADMIN'], 
    default: 'PATIENT' 
  },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }, // For Admins
  image: { type: String },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

export const User = mongoose.model('User', userSchema);