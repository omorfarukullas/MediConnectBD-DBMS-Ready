import React, { useState, useEffect } from 'react';
import { Star, User, Calendar, CheckCircle, TrendingUp, MessageSquare } from 'lucide-react';
import { Card } from '../components/UIComponents';
import { api } from '../services/apiClient';

interface Review {
    id: number;
    rating: number;
    comment: string;
    createdAt: string;
    patient: {
        name: string;
        email: string;
    };
    isVerified: boolean;
}

interface FeedbackViewProps {
    doctorId?: number;
    doctorProfile?: any;
}

const FeedbackView: React.FC<FeedbackViewProps> = ({ doctorId, doctorProfile }) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchReviews();
    }, [doctorId]);

    const fetchReviews = async () => {
        if (!doctorId) {
            setError('Doctor ID not found');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await api.getDoctorReviews(doctorId);
            setReviews(response.reviews || []);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching reviews:', err);
            setError(err.message || 'Failed to fetch reviews');
        } finally {
            setLoading(false);
        }
    };

    // Calculate statistics
    const calculateStats = () => {
        if (reviews.length === 0) {
            return {
                average: 0,
                total: 0,
                distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            };
        }

        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(review => {
            distribution[review.rating as keyof typeof distribution]++;
        });

        const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

        return {
            average: parseFloat(average.toFixed(1)),
            total: reviews.length,
            distribution
        };
    };

    const stats = calculateStats();

    const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm') => {
        const sizeClass = size === 'lg' ? 24 : 16;
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                    <Star
                        key={star}
                        size={sizeClass}
                        className={star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}
                    />
                ))}
            </div>
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading reviews...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Card className="bg-red-50 border-red-200">
                <p className="text-red-800">Error loading reviews: {error}</p>
                <button
                    onClick={fetchReviews}
                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                    Try again
                </button>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Average Rating Card */}
                <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
                    <div className="text-center">
                        <p className="text-sm text-yellow-700 font-medium mb-2">Average Rating</p>
                        <div className="text-5xl font-bold text-yellow-900 mb-2">
                            {stats.average || '0.0'}
                        </div>
                        {renderStars(Math.round(stats.average), 'lg')}
                        <p className="text-xs text-yellow-600 mt-2">Based on {stats.total} reviews</p>
                    </div>
                </Card>

                {/* Total Reviews */}
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <div className="text-center">
                        <p className="text-sm text-blue-700 font-medium mb-2">Total Reviews</p>
                        <div className="text-5xl font-bold text-blue-900 mb-2">{stats.total}</div>
                        <div className="flex items-center justify-center gap-2 text-xs text-blue-600 mt-2">
                            <TrendingUp size={14} />
                            <span>From verified patients</span>
                        </div>
                    </div>
                </Card>

                {/* Verified Reviews */}
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <div className="text-center">
                        <p className="text-sm text-green-700 font-medium mb-2">Verified Reviews</p>
                        <div className="text-5xl font-bold text-green-900 mb-2">
                            {reviews.filter(r => r.isVerified).length}
                        </div>
                        <div className="flex items-center justify-center gap-2 text-xs text-green-600 mt-2">
                            <CheckCircle size={14} />
                            <span>{((reviews.filter(r => r.isVerified).length / Math.max(stats.total, 1)) * 100).toFixed(0)}% verified</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Rating Distribution */}
            <Card>
                <h3 className="font-bold text-lg mb-4">Rating Distribution</h3>
                <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map(rating => {
                        const count = stats.distribution[rating as keyof typeof stats.distribution];
                        const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;

                        return (
                            <div key={rating} className="flex items-center gap-3">
                                <div className="flex items-center gap-1 w-20">
                                    <span className="text-sm font-medium">{rating}</span>
                                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                </div>
                                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-yellow-500 h-full rounded-full transition-all"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <span className="text-sm text-slate-600 w-16 text-right">
                                    {count} ({percentage.toFixed(0)}%)
                                </span>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Reviews List */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <MessageSquare size={20} />
                        Patient Reviews
                    </h3>
                </div>

                {reviews.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <Star size={48} className="mx-auto mb-3 text-slate-300" />
                        <p>No reviews yet</p>
                        <p className="text-sm mt-1">Your patient reviews will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reviews.map(review => (
                            <div
                                key={review.id}
                                className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                                            <User size={20} className="text-primary-600" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-slate-900">
                                                    {review.patient.name}
                                                </h4>
                                                {review.isVerified && (
                                                    <CheckCircle size={14} className="text-green-600" />
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500">{review.patient.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {renderStars(review.rating)}
                                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                            <Calendar size={12} />
                                            {formatDate(review.createdAt)}
                                        </div>
                                    </div>
                                </div>
                                {review.comment && (
                                    <p className="text-slate-700 text-sm leading-relaxed pl-13">
                                        "{review.comment}"
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};

export { FeedbackView };
export default FeedbackView;
