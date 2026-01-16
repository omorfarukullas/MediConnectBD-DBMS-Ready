const { Review, Doctor, User, Appointment } = require('../models');

/**
 * @desc    Create a new review for a doctor
 * @route   POST /api/reviews
 * @access  Private (Patient only)
 */
const createReview = async (req, res) => {
    const { doctorId, rating, comment, appointmentId } = req.body;

    try {
        // Validate input
        if (!doctorId || !rating) {
            return res.status(400).json({ message: 'Doctor ID and rating are required' });
        }

        // Check if doctor exists
        const doctor = await Doctor.findByPk(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Check if user already reviewed this doctor
        const existingReview = await Review.findOne({
            where: {
                patientId: req.user.id,
                doctorId: doctorId
            }
        });

        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this doctor. Use update instead.' });
        }

        // Create review
        const review = await Review.create({
            patientId: req.user.id,
            doctorId,
            rating,
            comment,
            appointmentId,
            isVerified: appointmentId ? true : false
        });

        // Update doctor's average rating
        const allReviews = await Review.findAll({ where: { doctorId } });
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        await doctor.update({ rating: avgRating.toFixed(1) });

        res.status(201).json({
            message: 'Review created successfully',
            review
        });
    } catch (error) {
        console.error('Create Review Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Get all reviews for a specific doctor
 * @route   GET /api/reviews/doctor/:doctorId
 * @access  Public
 */
const getDoctorReviews = async (req, res) => {
    try {
        const { doctorId } = req.params;

        const reviews = await Review.findAll({
            where: { doctorId },
            include: [
                {
                    model: User,
                    as: 'patient',
                    attributes: ['id', 'name', 'image']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            count: reviews.length,
            reviews
        });
    } catch (error) {
        console.error('Get Doctor Reviews Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Get reviews written by the current user
 * @route   GET /api/reviews/my-reviews
 * @access  Private
 */
const getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.findAll({
            where: { patientId: req.user.id },
            include: [
                {
                    model: Doctor,
                    as: 'doctor',
                    include: [
                        {
                            model: User,
                            attributes: ['name', 'image']
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            count: reviews.length,
            reviews
        });
    } catch (error) {
        console.error('Get My Reviews Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Update a review
 * @route   PUT /api/reviews/:id
 * @access  Private (Review owner only)
 */
const updateReview = async (req, res) => {
    try {
        const review = await Review.findByPk(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Check if user owns this review
        if (review.patientId !== req.user.id) {
            return res.status(403).json({ message: 'You can only update your own reviews' });
        }

        // Update review
        review.rating = req.body.rating || review.rating;
        review.comment = req.body.comment || review.comment;

        const updatedReview = await review.save();

        // Recalculate doctor's average rating
        const allReviews = await Review.findAll({ where: { doctorId: review.doctorId } });
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        await Doctor.update({ rating: avgRating.toFixed(1) }, { where: { id: review.doctorId } });

        res.json({
            message: 'Review updated successfully',
            review: updatedReview
        });
    } catch (error) {
        console.error('Update Review Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:id
 * @access  Private (Review owner or Admin)
 */
const deleteReview = async (req, res) => {
    try {
        const review = await Review.findByPk(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Check if user owns this review or is an admin
        if (review.patientId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const doctorId = review.doctorId;
        await review.destroy();

        // Recalculate doctor's average rating
        const remainingReviews = await Review.findAll({ where: { doctorId } });
        if (remainingReviews.length > 0) {
            const avgRating = remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length;
            await Doctor.update({ rating: avgRating.toFixed(1) }, { where: { id: doctorId } });
        } else {
            await Doctor.update({ rating: 0 }, { where: { id: doctorId } });
        }

        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Delete Review Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    createReview,
    getDoctorReviews,
    getMyReviews,
    updateReview,
    deleteReview
};
