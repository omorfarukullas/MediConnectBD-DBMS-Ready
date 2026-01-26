const pool = require('../config/db');

/**
 * @desc    Create a new review for a doctor
 * @route   POST /api/reviews
 * @access  Private (Patient only)
 */
const createReview = async (req, res) => {
    const { doctorId, rating, comment, appointmentId } = req.body;
    console.log('📩 Create Review Request:', { user: req.user.id, body: req.body });

    try {
        // Validate input
        if (!doctorId || !rating) {
            console.error('❌ Missing doctorId or rating');
            return res.status(400).json({ message: 'Doctor ID and rating are required' });
        }

        // Check if doctor exists
        console.log('🔍 Checking doctor existence for ID:', doctorId);
        const [doctors] = await pool.execute('SELECT id FROM doctors WHERE id = ?', [doctorId]);
        if (doctors.length === 0) {
            console.log('❌ Doctor not found');
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Get Patient ID from User ID
        console.log('🔍 Looking up Patient ID for User ID:', req.user.id);
        const [patientData] = await pool.execute('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
        if (patientData.length === 0) {
            console.log('❌ Patient profile not found');
            return res.status(404).json({ message: 'Patient profile not found. Please complete your profile.' });
        }
        const patientId = patientData[0].id;
        console.log('✅ Found Patient ID:', patientId);

        // Check if user already reviewed this doctor using PATIENT ID
        console.log('🔍 Checking for existing reviews...');
        const [existingReviews] = await pool.execute(
            'SELECT id FROM reviews WHERE patient_id = ? AND doctor_id = ?',
            [patientId, doctorId]
        );
        console.log('📋 Existing reviews count:', existingReviews.length);

        let reviewId;

        if (existingReviews.length > 0) {
            // UPDATE existing review (Upsert)
            reviewId = existingReviews[0].id;
            console.log(`📝 Updating existing review ${reviewId} for doctor ${doctorId}`);

            await pool.execute(
                'UPDATE reviews SET rating = ?, comment = ?, appointment_id = ?, updated_at = NOW() WHERE id = ?',
                [rating, comment || null, appointmentId || null, reviewId]
            );
            console.log('✅ Update executed successfully');
        } else {
            // INSERT new review
            console.log(`📝 Creating new review for doctor ${doctorId}`);
            const [result] = await pool.execute(
                'INSERT INTO reviews (patient_id, doctor_id, rating, comment, appointment_id, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
                [patientId, doctorId, rating, comment || null, appointmentId || null, appointmentId ? 1 : 0]
            );
            reviewId = result.insertId;
            console.log('✅ Insert executed successfully, ID:', reviewId);
        }

        // Update doctor's average rating
        console.log('🔄 Recalculating average rating...');
        const [allReviews] = await pool.execute('SELECT rating FROM reviews WHERE doctor_id = ?', [doctorId]);
        if (allReviews.length > 0) {
            const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
            console.log(`🔄 Updating doctor ${doctorId} average rating to ${avgRating.toFixed(1)}`);
            await pool.execute('UPDATE doctors SET rating = ? WHERE id = ?', [avgRating.toFixed(1), doctorId]);
        }

        res.status(existingReviews.length > 0 ? 200 : 201).json({
            message: existingReviews.length > 0 ? 'Review updated successfully' : 'Review created successfully',
            review: {
                id: reviewId,
                patientId: req.user.id, // Return user ID as patientId for frontend consistency if needed
                realPatientId: patientId,
                doctorId,
                rating,
                comment,
                appointmentId
            }
        });
    } catch (error) {
        console.error('Create/Update Review Error:', error);
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
        console.log(`🔍 Fetching reviews for Doctor ID: ${doctorId}`);

        const [reviews] = await pool.execute(
            `SELECT r.id, r.patient_id, r.doctor_id, r.rating, r.comment, r.appointment_id, r.is_verified, r.created_at, r.updated_at,
                    p.full_name as patient_name, u.email as patient_email
             FROM reviews r
             LEFT JOIN patients p ON r.patient_id = p.id
             LEFT JOIN users u ON p.user_id = u.id
             WHERE r.doctor_id = ?
             ORDER BY r.created_at DESC`,
            [doctorId]
        );
        console.log(`✅ Found ${reviews.length} reviews for Doctor ID ${doctorId}`);

        const formattedReviews = reviews.map(r => ({
            id: r.id,
            patientId: r.patient_id,
            doctorId: r.doctor_id,
            rating: r.rating,
            comment: r.comment,
            appointmentId: r.appointment_id,
            isVerified: r.is_verified,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            patient: {
                id: r.patient_id,
                name: r.patient_name,
                email: r.patient_email
            }
        }));

        res.json({
            count: formattedReviews.length,
            reviews: formattedReviews
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
        const [reviews] = await pool.execute(
            `SELECT r.id, r.patient_id, r.doctor_id, r.rating, r.comment, r.appointment_id, r.is_verified, r.created_at, r.updated_at,
                    d.full_name as doctor_name, d.specialization, d.email as doctor_email
             FROM reviews r
             LEFT JOIN doctors d ON r.doctor_id = d.id
             WHERE r.patient_id = ?
             ORDER BY r.created_at DESC`,
            [req.user.id]
        );

        const formattedReviews = reviews.map(r => ({
            id: r.id,
            patientId: r.patient_id,
            doctorId: r.doctor_id,
            rating: r.rating,
            comment: r.comment,
            appointmentId: r.appointment_id,
            isVerified: r.is_verified,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            doctor: {
                name: r.doctor_name,
                specialization: r.specialization,
                email: r.doctor_email
            }
        }));

        res.json({
            count: formattedReviews.length,
            reviews: formattedReviews
        });
    } catch (error) {
        console.error('Get My Reviews Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Get all reviews for the hospital (Admin only)
 * @route   GET /api/reviews/hospital
 * @access  Private (Admin only)
 */
const getHospitalReviews = async (req, res) => {
    try {
        // For now, fetching ALL reviews since we are in single-hospital mode
        // In multi-hospital, we would filter by admin's hospital_id
        const [reviews] = await pool.execute(
            `SELECT r.id, r.patient_id, r.doctor_id, r.rating, r.comment, r.appointment_id, r.is_verified, r.created_at, r.updated_at,
                    p.full_name as patient_name,
                    d.full_name as doctor_name, d.specialization
             FROM reviews r
             LEFT JOIN patients p ON r.patient_id = p.id
             LEFT JOIN doctors d ON r.doctor_id = d.id
             ORDER BY r.created_at DESC`
        );

        const formattedReviews = reviews.map(r => ({
            id: r.id,
            patientId: r.patient_id,
            patientName: r.patient_name,
            doctorId: r.doctor_id,
            doctorName: r.doctor_name,
            specialization: r.specialization,
            rating: r.rating,
            comment: r.comment,
            appointmentId: r.appointment_id,
            isVerified: r.is_verified,
            createdAt: r.created_at
        }));

        res.json({
            count: formattedReviews.length,
            reviews: formattedReviews
        });
    } catch (error) {
        console.error('Get Hospital Reviews Error:', error);
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
        const [reviews] = await pool.execute(
            'SELECT id, patient_id, doctor_id, rating, comment FROM reviews WHERE id = ?',
            [req.params.id]
        );

        if (reviews.length === 0) {
            return res.status(404).json({ message: 'Review not found' });
        }

        const review = reviews[0];

        // Check if user owns this review
        if (review.patient_id !== req.user.id) {
            return res.status(403).json({ message: 'You can only update your own reviews' });
        }

        // Update review
        const newRating = req.body.rating || review.rating;
        const newComment = req.body.comment || review.comment;

        await pool.execute(
            'UPDATE reviews SET rating = ?, comment = ?, updated_at = NOW() WHERE id = ?',
            [newRating, newComment, req.params.id]
        );

        // Recalculate doctor's average rating
        const [allReviews] = await pool.execute(
            'SELECT rating FROM reviews WHERE doctor_id = ?',
            [review.doctor_id]
        );
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        await pool.execute(
            'UPDATE doctors SET rating = ? WHERE id = ?',
            [avgRating.toFixed(1), review.doctor_id]
        );

        res.json({
            message: 'Review updated successfully',
            review: {
                id: req.params.id,
                patientId: req.user.id,
                doctorId: review.doctor_id,
                rating: newRating,
                comment: newComment
            }
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
        const [reviews] = await pool.execute(
            'SELECT id, patient_id, doctor_id FROM reviews WHERE id = ?',
            [req.params.id]
        );

        if (reviews.length === 0) {
            return res.status(404).json({ message: 'Review not found' });
        }

        const review = reviews[0];

        // Check if user owns this review or is admin
        if (review.patient_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'You can only delete your own reviews' });
        }

        const doctorId = review.doctor_id;

        // Delete review
        await pool.execute('DELETE FROM reviews WHERE id = ?', [req.params.id]);

        // Recalculate doctor's average rating
        const [remainingReviews] = await pool.execute(
            'SELECT rating FROM reviews WHERE doctor_id = ?',
            [doctorId]
        );

        if (remainingReviews.length > 0) {
            const avgRating = remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length;
            await pool.execute(
                'UPDATE doctors SET rating = ? WHERE id = ?',
                [avgRating.toFixed(1), doctorId]
            );
        } else {
            await pool.execute(
                'UPDATE doctors SET rating = 0 WHERE id = ?',
                [doctorId]
            );
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
    deleteReview,
    getHospitalReviews
};
