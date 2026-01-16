import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  
  patientName: { type: String, required: true }, // Snapshot in case user deleted
  doctorName: { type: String, required: true },

  date: { type: String, required: true }, // Format: YYYY-MM-DD
  time: { type: String, required: true }, // Format: HH:MM AM/PM
  
  type: { type: String, enum: ['In-Person', 'Telemedicine'], required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Missed'], 
    default: 'Pending' 
  },
  
  queueNumber: { type: Number }, // Token Number
  symptoms: { type: String },
  
  paymentStatus: { type: String, enum: ['Paid', 'Unpaid'], default: 'Unpaid' }
}, { timestamps: true });

export const Appointment = mongoose.model('Appointment', appointmentSchema);