import express from 'express';
import { Ambulance } from '../models/Ambulance';

const router = express.Router();

// Get Ambulances near lat/lng
router.get('/nearby', async (req, res) => {
    const { lat, lng } = req.query;

    if(!lat || !lng) return res.status(400).json({ message: "Coordinates required" });

    try {
        const ambulances = await Ambulance.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng as string), parseFloat(lat as string)]
                    },
                    $maxDistance: 5000 // 5km
                }
            },
            status: { $ne: 'Busy' }
        });
        res.json(ambulances);
    } catch (error) {
        res.status(500).json({ message: "Error finding ambulances" });
    }
});

export default router;