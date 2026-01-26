import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Video, User, CheckCircle, ArrowRight, Users, AlertCircle } from 'lucide-react';
import api from '../services/apiClient';
import { Button } from './UIComponents';
import { formatFullDate, formatTime, getCapacityColor, getCapacityStatus, getDateLabel } from '../utils/dateFormatters';

interface Session {
    id: number;
    slot_date: string;
    slot_start_time: string;
    slot_end_time: string;
    appointment_type: 'telemedicine' | 'physical';
    max_appointments: number;
    current_bookings: number;
    available_spots: number;
    doctor_name: string;
    specialization: string;
    consultation_fee: number;
}

interface SessionsByDate {
    [date: string]: Session[];
}

interface SlotBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    doctorId: number;
    doctorName: string;
    doctorSpecialization: string;
    onBookingComplete: (appointment: any) => void;
}

export const SlotBookingModal: React.FC<SlotBookingModalProps> = ({
    isOpen,
    onClose,
    doctorId,
    doctorName,
    doctorSpecialization,
    onBookingComplete
}) => {
    const [step, setStep] = useState<'type' | 'session' | 'details' | 'success'>('type');
    const [appointmentType, setAppointmentType] = useState<'telemedicine' | 'physical'>('physical');
    const [sessionsByDate, setSessionsByDate] = useState<SessionsByDate>({});
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [symptoms, setSymptoms] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [bookedAppointment, setBookedAppointment] = useState<any>(null);

    useEffect(() => {
        if (isOpen && step === 'session') {
            fetchSessions();
        }
    }, [isOpen, step, appointmentType]);

    useEffect(() => {
        if (!isOpen) {
            // Reset modal state when closed
            setStep('type');
            setSelectedSession(null);
            setSymptoms('');
            setError('');
            setBookedAppointment(null);
        }
    }, [isOpen]);

    const fetchSessions = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get<{ success: boolean; slotsByDate: SessionsByDate; slots: Session[] }>(
                `/slots/available/${doctorId}?appointmentType=${appointmentType}`
            );

            if (response.data.success) {
                // Helper to recalculate spots
                const recalculateSlots = (slots: Session[]) => slots.map(slot => ({
                    ...slot,
                    // Force calculation to ensure accuracy if backend sends stale data
                    available_spots: Math.max(0, slot.max_appointments - (slot.current_bookings || 0))
                }));

                // Use slotsByDate if available, otherwise group manually
                if (response.data.slotsByDate) {
                    const processedSlotsByDate: SessionsByDate = {};
                    Object.keys(response.data.slotsByDate).forEach(date => {
                        processedSlotsByDate[date] = recalculateSlots(response.data.slotsByDate[date]);
                    });
                    setSessionsByDate(processedSlotsByDate);
                } else {
                    // Fallback: group slots by date
                    const processedSlots = recalculateSlots(response.data.slots);
                    const grouped = processedSlots.reduce((acc, slot) => {
                        const date = slot.slot_date.split('T')[0];
                        if (!acc[date]) acc[date] = [];
                        acc[date].push(slot);
                        return acc;
                    }, {} as SessionsByDate);
                    setSessionsByDate(grouped);
                }
            }
        } catch (err: any) {
            console.error('Error fetching sessions:', err);
            setError('Failed to load available sessions');
        } finally {
            setLoading(false);
        }
    };

    const handleBookAppointment = async () => {
        if (!selectedSession) return;

        setLoading(true);
        setError('');
        try {
            const response = await api.post('/appointments', {
                doctorId,
                slotId: selectedSession.id,
                appointmentType: selectedSession.appointment_type,
                symptoms
            });

            if (response.data.success) {
                setBookedAppointment(response.data.appointment);
                setStep('success');
                onBookingComplete(response.data.appointment);
            }
        } catch (err: any) {
            console.error('Error booking appointment:', err);
            setError(err.response?.data?.message || 'Failed to book appointment');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        onClose();
    };

    const getSortedDates = () => {
        return Object.keys(sessionsByDate).sort((a, b) => a.localeCompare(b));
    };

    const totalSessions = getSortedDates().reduce((sum, date) => sum + sessionsByDate[date].length, 0);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold">Book Appointment</h3>
                        <p className="text-sm text-blue-100 mt-1">{doctorName} • {doctorSpecialization}</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-white hover:bg-blue-500 rounded-full p-2 transition"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Progress Indicator */}
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-center gap-2">
                        <div className={`flex items-center gap-2 ${step === 'type' ? 'text-blue-600 font-semibold' : step !== 'type' ? 'text-green-600' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'type' ? 'bg-blue-600 text-white' : step !== 'type' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                {step !== 'type' ? <CheckCircle size={16} /> : '1'}
                            </div>
                            <span className="text-sm">Type</span>
                        </div>
                        <div className="w-12 h-0.5 bg-gray-300"></div>
                        <div className={`flex items-center gap-2 ${step === 'session' ? 'text-blue-600 font-semibold' : step === 'details' || step === 'success' ? 'text-green-600' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'session' ? 'bg-blue-600 text-white' : step === 'details' || step === 'success' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                {step === 'details' || step === 'success' ? <CheckCircle size={16} /> : '2'}
                            </div>
                            <span className="text-sm">Date & Time</span>
                        </div>
                        <div className="w-12 h-0.5 bg-gray-300"></div>
                        <div className={`flex items-center gap-2 ${step === 'details' ? 'text-blue-600 font-semibold' : step === 'success' ? 'text-green-600' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'details' ? 'bg-blue-600 text-white' : step === 'success' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                {step === 'success' ? <CheckCircle size={16} /> : '3'}
                            </div>
                            <span className="text-sm">Confirm</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Appointment Type Selection */}
                    {step === 'type' && (
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold text-gray-800 mb-4">Select Appointment Type</h4>

                            <div
                                onClick={() => setAppointmentType('physical')}
                                className={`p-6 rounded-lg border-2 cursor-pointer transition ${appointmentType === 'physical'
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 hover:border-green-300'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-full bg-green-100">
                                        <User size={24} className="text-green-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="font-semibold text-gray-800 mb-1">Physical Visit</h5>
                                        <p className="text-sm text-gray-600">In-person consultation at doctor's chamber</p>
                                        <p className="text-lg font-bold text-green-600 mt-2">৳{selectedSession?.consultation_fee || 1000}</p>
                                    </div>
                                    {appointmentType === 'physical' && (
                                        <CheckCircle className="text-green-600" size={24} />
                                    )}
                                </div>
                            </div>

                            <div
                                onClick={() => setAppointmentType('telemedicine')}
                                className={`p-6 rounded-lg border-2 cursor-pointer transition ${appointmentType === 'telemedicine'
                                    ? 'border-purple-500 bg-purple-50'
                                    : 'border-gray-200 hover:border-purple-300'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-full bg-purple-100">
                                        <Video size={24} className="text-purple-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="font-semibold text-gray-800 mb-1">Telemedicine</h5>
                                        <p className="text-sm text-gray-600">Online video consultation from home</p>
                                        <p className="text-lg font-bold text-purple-600 mt-2">৳{selectedSession?.consultation_fee || 800}</p>
                                    </div>
                                    {appointmentType === 'telemedicine' && (
                                        <CheckCircle className="text-purple-600" size={24} />
                                    )}
                                </div>
                            </div>

                            <Button
                                onClick={() => setStep('session')}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 py-3"
                            >
                                Continue to Select Date
                                <ArrowRight size={18} />
                            </Button>
                        </div>
                    )}

                    {/* Step 2: Session Selection (Date-based) */}
                    {step === 'session' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-semibold text-gray-800">
                                    Available {appointmentType === 'physical' ? 'Physical' : 'Telemedicine'} Sessions
                                </h4>
                                <span className="text-sm text-gray-500">{totalSessions} sessions found</span>
                            </div>

                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="text-gray-600 mt-4">Loading available sessions...</p>
                                </div>
                            ) : error ? (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                                    <AlertCircle className="mx-auto text-red-600 mb-2" size={32} />
                                    <p className="text-red-800">{error}</p>
                                </div>
                            ) : getSortedDates().length === 0 ? (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
                                    <Calendar className="mx-auto text-yellow-600 mb-3" size={48} />
                                    <h5 className="font-semibold text-gray-800 mb-2">No Available Sessions</h5>
                                    <p className="text-gray-600">
                                        No {appointmentType} sessions available in the next 14 days.
                                        <br />Please try a different appointment type or check back later.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {getSortedDates().map(date => (
                                        <div key={date} className="border border-gray-200 rounded-lg overflow-hidden">
                                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                                                    <Calendar size={16} className="text-blue-600" />
                                                    {getDateLabel(date)}
                                                </h5>
                                            </div>
                                            <div className="p-2 space-y-2">
                                                {sessionsByDate[date].map(session => (
                                                    <div
                                                        key={session.id}
                                                        onClick={() => session.available_spots > 0 && setSelectedSession(session)}
                                                        className={`p-4 rounded-lg border-2 cursor-pointer transition ${selectedSession?.id === session.id
                                                            ? 'border-blue-500 bg-blue-50'
                                                            : session.available_spots > 0
                                                                ? 'border-gray-200 hover:border-blue-300 bg-white'
                                                                : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <Clock size={20} className="text-gray-600" />
                                                                <div>
                                                                    <p className="font-semibold text-gray-800">
                                                                        {formatTime(session.slot_start_time)} - {formatTime(session.slot_end_time)}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <Users size={14} className={getCapacityColor(session.available_spots, session.max_appointments)} />
                                                                        <p className={`text-sm ${getCapacityColor(session.available_spots, session.max_appointments)}`}>
                                                                            {getCapacityStatus(session.available_spots)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold text-blue-600">৳{session.consultation_fee}</p>
                                                                {selectedSession?.id === session.id && (
                                                                    <CheckCircle className="text-blue-600 ml-auto mt-1" size={20} />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <Button
                                    onClick={() => setStep('type')}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={() => setStep('details')}
                                    disabled={!selectedSession}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    Continue to Details
                                    <ArrowRight size={18} className="ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Details & Confirmation */}
                    {step === 'details' && selectedSession && (
                        <div className="space-y-4">
                            <h4 className="text-lg font-semibold text-gray-800 mb-4">Appointment Details</h4>

                            {/* Summary Card */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h5 className="font-semibold text-gray-800 mb-3">Booking Summary</h5>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Date:</span>
                                        <span className="font-semibold">{formatFullDate(selectedSession.slot_date)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Time:</span>
                                        <span className="font-semibold">
                                            {formatTime(selectedSession.slot_start_time)} - {formatTime(selectedSession.slot_end_time)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Type:</span>
                                        <span className="font-semibold capitalize">{selectedSession.appointment_type}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Fee:</span>
                                        <span className="font-bold text-blue-600">৳{selectedSession.consultation_fee}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Reason for Visit */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Reason for Visit / Symptoms *
                                </label>
                                <textarea
                                    value={symptoms}
                                    onChange={(e) => setSymptoms(e.target.value)}
                                    placeholder="Please describe your symptoms or reason for consultation..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    rows={4}
                                    required
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <Button
                                    onClick={() => setStep('session')}
                                    variant="outline"
                                    className="flex-1"
                                    disabled={loading}
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleBookAppointment}
                                    disabled={loading || !symptoms.trim()}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Booking...' : 'Confirm Booking'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Success */}
                    {step === 'success' && bookedAppointment && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={40} className="text-green-600" />
                            </div>
                            <h4 className="text-2xl font-bold text-gray-800 mb-2">Appointment Confirmed!</h4>
                            <p className="text-gray-600 mb-6">Your appointment has been successfully booked</p>

                            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
                                <h5 className="font-semibold text-gray-800 mb-4">Appointment Details</h5>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="text-blue-600" size={20} />
                                        <div>
                                            <p className="text-sm text-gray-600">Date</p>
                                            <p className="font-semibold">{formatFullDate(bookedAppointment.appointmentDate)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Clock className="text-blue-600" size={20} />
                                        <div>
                                            <p className="text-sm text-gray-600">Time</p>
                                            <p className="font-semibold">{formatTime(bookedAppointment.appointmentTime)}</p>
                                        </div>
                                    </div>
                                    {bookedAppointment.queueNumber && (
                                        <div className="flex items-center gap-3">
                                            <Users className="text-blue-600" size={20} />
                                            <div>
                                                <p className="text-sm text-gray-600">Queue Number</p>
                                                <p className="font-bold text-2xl text-blue-600">#{bookedAppointment.queueNumber}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Button
                                onClick={handleClose}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                            >
                                Done
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SlotBookingModal;
