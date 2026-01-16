import { Request, Response } from 'express';
import { Doctor } from '../models/Doctor';

// @desc    Get all doctors with filters
// @route   GET /api/doctors
export const getDoctors = async (req: Request, res: Response) => {
  try {
    const { search, city, specialty, hospital } = req.query;
    
    let query: any = { status: 'Active' };

    if (specialty && specialty !== 'All Specialties') {
        query.specialization = specialty;
    }
    if (hospital && hospital !== 'All Hospitals') {
        query.hospital = hospital;
    }
    if (search) {
        query.$or = [
            { 'name': { $regex: search, $options: 'i' } },
            { 'hospital': { $regex: search, $options: 'i' } }
        ];
    }
    // Note: City filtering would rely on a 'location' string regex or geospatial match in a real app

    const doctors = await Doctor.find(query);
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get doctor by ID
// @route   GET /api/doctors/:id
export const getDoctorById = async (req: Request, res: Response) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('user', 'name email');
    if (doctor) {
      res.json(doctor);
    } else {
      res.status(404).json({ message: 'Doctor not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};