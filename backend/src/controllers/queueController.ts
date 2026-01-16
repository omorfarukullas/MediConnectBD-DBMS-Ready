import { Request, Response } from 'express';
import { Doctor } from '../models/Doctor';
import { Appointment } from '../models/Appointment';

// @desc    Get live queue for a doctor
// @route   GET /api/queue/:doctorId
export const getQueueStatus = async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.params;
    
    // In a real app, you might have a separate Queue model. 
    // Here we aggregate Appointments.
    const today = new Date().toISOString().split('T')[0];
    
    const appointments = await Appointment.find({ 
        doctor: doctorId, 
        date: today,
        status: { $in: ['Confirmed', 'Pending'] }
    }).sort({ queueNumber: 1 });

    const currentServing = appointments.find(a => a.status === 'Confirmed'); // Simplification for demo

    res.json({
        totalWaiting: appointments.length,
        currentServingToken: currentServing?.queueNumber || 0,
        list: appointments
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Advance Queue (Socket.io Trigger usually)
// @route   POST /api/queue/:doctorId/next
export const nextPatient = async (req: Request, res: Response) => {
    // Logic to update appointment status to 'Completed' and next to 'Serving'
    // This would emit a Socket.io event to all connected clients
    res.json({ message: "Queue advanced" });
}