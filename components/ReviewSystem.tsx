import React, { useState } from 'react';
import { Star, Send, X } from 'lucide-react';
import { Button, Modal } from './UIComponents';
import { api } from '../services/apiClient';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: number;
  doctorName: string;
  appointmentId?: number;
  onReviewSubmitted?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  doctorId,
  doctorName,
  appointmentId,
  onReviewSubmitted
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (!comment.trim()) {
      setError('Please write a review');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.createReview({
        doctorId,
        appointmentId,
        rating,
        comment: comment.trim()
      });

      // Success
      setRating(0);
      setComment('');
      onReviewSubmitted?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Rate Your Experience">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Doctor Info */}
        <div className="text-center">
          <p className="text-slate-600">How was your experience with</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{doctorName}?</h3>
        </div>

        {/* Star Rating */}
        <div className="flex flex-col items-center space-y-2">
          <label className="text-sm font-medium text-slate-700">Your Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={40}
                  className={`${
                    star <= (hoveredRating || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-slate-300'
                  } transition-colors`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-slate-600">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          )}
        </div>

        {/* Review Comment */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Write your review
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full p-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            placeholder="Share your experience with the doctor, treatment quality, waiting time, etc."
            maxLength={500}
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-slate-500">
              {comment.length}/500 characters
            </p>
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Send size={16} />
            Submit Review
          </Button>
        </div>
      </form>
    </Modal>
  );
};

interface DoctorReviewsProps {
  doctorId: number;
  className?: string;
}

export const DoctorReviews: React.FC<DoctorReviewsProps> = ({ doctorId, className = '' }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  React.useEffect(() => {
    fetchReviews();
  }, [doctorId]);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const data: any = await api.getDoctorReviews(doctorId);
      setReviews(data.reviews || []);
      
      // Calculate average rating
      if (data.reviews && data.reviews.length > 0) {
        const avg = data.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / data.reviews.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={`${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`${className} space-y-4`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-24"></div>
              </div>
            </div>
            <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Rating Summary */}
      {reviews.length > 0 && (
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 p-6 rounded-xl mb-6 border border-primary-100">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary-600">{averageRating}</div>
              <div className="flex mt-2">{renderStars(Math.round(averageRating))}</div>
              <p className="text-sm text-slate-600 mt-1">{reviews.length} reviews</p>
            </div>
            <div className="flex-1 pl-6 border-l border-primary-200">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = reviews.filter((r: any) => r.rating === rating).length;
                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={rating} className="flex items-center gap-3 mb-2">
                    <span className="text-sm text-slate-600 w-12">{rating} star</span>
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-slate-600 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
            <Star size={48} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">No reviews yet</p>
            <p className="text-sm text-slate-400 mt-1">Be the first to review this doctor</p>
          </div>
        ) : (
          reviews.map((review: any) => (
            <div key={review.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                  {review.patientName?.[0] || 'P'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        {review.patientName || 'Patient'}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(review.rating)}
                        <span className="text-xs text-slate-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {review.isVerified && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    {review.comment}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
