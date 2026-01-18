import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Video, User, CheckCircle, ArrowRight } from 'lucide-react';
import api from '../services/apiClient';
import { Button } from './UIComponents';

interface Slot {
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
    const [step, setStep] = useState<'type' | 'slot' | 'details' | 'success'>('type');
    const [appointmentType, setAppointmentType] = useState<'telemedicine' | 'physical'>('physical');
    const [slots, setSlots] = useState<Slot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
    const [symptoms, setSymptoms] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [bookedAppointment, setBookedAppointment] = useState<any>(null);

    useEffect(() => {
        if (isOpen && step === 'slot') {
            fetchSlots();
        }
    }, [isOpen, step, appointmentType]);

    const fetchSlots = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get<{ success: boolean; slots: Slot[] }>(
                `/slots/available/${doctorId}?appointmentType=${appointmentType}`
            );
            if (response.data.success) {
                setSlots(response.data.slots);
            }
        } catch (err: any) {
            console.error('Error fetching slots:', err);
            setError('Failed to load available slots');
        } finally {
            setLoading(false);
        }
    };

    const handleBookAppointment = async () => {
        if (!selectedSlot) return;

        setLoading(true);
        setError('');
        try {
            const response = await api.post('/appointments', {
                doctorId,
                slotId: selectedSlot.id,
                appointmentType: selectedSlot.appointment_type,
                symptoms
            });

            if (response.data.success) {
                setBookedAppointment(response.data.appointment);
                setStep('success');
            }
        } catch (err: any) {
            console.error('Error booking appointment:', err);
            setError(err.response?.data?.message || 'Failed to book appointment');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const groupSlotsByDate = () => {
        return slots.reduce((acc, slot) => {
            const date = slot.slot_date.split('T')[0];
            if (!acc[date]) acc[date] = [];
            acc[date].push(slot);
            return acc;
        }, {} as Record<string, Slot[]>);
    };

    const resetModal = () => {
        setStep('type');
        setAppointmentType('physical');
        setSelectedSlot(null);
        setSymptoms('');
        setError('');
        setBookedAppointment(null);
    };

    const handleClose = () => {
        resetModal();
        onClose();
    };

    const handleComplete = () => {
        if (bookedAppointment) {
            onBookingComplete(bookedAppointment);
        }
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Book Appointment</h2>
                        <p className="text-gray-600">{doctorName} • {doctorSpecialization}</p>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-6 mt-4 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
                        {error}
                    </div>
                )}

                {/* Step 1: Select Appointment Type */}
                {step === 'type' && (
                    <div className="p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                Select Appointment Type
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setAppointmentType('physical')}
                                    className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${
                                        appointmentType === 'physical'
                                            ? 'border-green-500 bg-green-50 shadow-md'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <User size={32} className={appointmentType === 'physical' ? 'text-green-600' : 'text-gray-400'} />
                                    <div className="text-center">
                                        <h4 className="font-semibold text-gray-800">Physical Visit</h4>
                                        <p className="text-sm text-gray-500 mt-1">In-person consultation</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setAppointmentType('telemedicine')}
                                    className={`p-6 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${
                                        appointmentType === 'telemedicine'
                                            ? 'border-purple-500 bg-purple-50 shadow-md'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <Video size={32} className={appointmentType === 'telemedicine' ? 'text-purple-600' : 'text-gray-400'} />
                                    <div className="text-center">
                                        <h4 className="font-semibold text-gray-800">Telemedicine</h4>
                                        <p className="text-sm text-gray-500 mt-1">Video consultation</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                        <Button
                            onClick={() => setStep('slot')}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg flex items-center justify-center gap-2"
                        >
                            Continue <ArrowRight size={18} />
                        </Button>
                    </div>
                )}

                {/* Step 2: Select Time Slot */}
                {step === 'slot' && (
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800">
                                Available {appointmentType === 'telemedicine' ? 'Telemedicine' : 'Physical'} Slots
                            </h3>
                            <button
                                onClick={() => setStep('type')}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Change Type
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                            </div>
                        ) : slots.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg">
                                <Calendar size={48} className="mx-auto text-gray-400 mb-3" />
                                <h4 className="text-lg font-semibold text-gray-700 mb-2">No slots available</h4>
                                <p className="text-gray-500">Please try a different appointment type or check back later</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(groupSlotsByDate()).map(([date, dateSlots]) => (
                                    <div key={date} className="bg-gray-50 rounded-lg p-4">
                                        <h4 className="font-semibold text-gray-800 mb-3">
                                            {formatDate(date)}
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {dateSlots.map(slot => (
                                                <button
                                                    key={slot.id}
                                                    onClick={() => setSelectedSlot(slot)}
                                                    disabled={slot.available_spots === 0}
                                                    className={`p-3 rounded-lg border-2 text-sm transition-all ${
                                                        selectedSlot?.id === slot.id
                                                            ? 'border-blue-500 bg-blue-50 shadow-md'
                                                            : slot.available_spots === 0
                                                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                                            : 'border-gray-200 hover:border-blue-300 bg-white'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 justify-center">
                                                        <Clock size={14} />
                                                        <span className="font-medium">
                                                            {formatTime(slot.slot_start_time)}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs mt-1 text-gray-500">
                                                        {slot.available_spots} spot{slot.available_spots !== 1 ? 's' : ''} left
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedSlot && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-800 mb-2">Selected Slot</h4>
                                <div className="space-y-1 text-sm">
                                    <p><span className="text-gray-600">Date:</span> <span className="font-medium">{formatDate(selectedSlot.slot_date)}</span></p>
                                    <p><span className="text-gray-600">Time:</span> <span className="font-medium">{formatTime(selectedSlot.slot_start_time)} - {formatTime(selectedSlot.slot_end_time)}</span></p>
                                    <p><span className="text-gray-600">Fee:</span> <span className="font-medium">৳{selectedSlot.consultation_fee}</span></p>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('type')}
                                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                Back
                            </button>
                            <Button
                                onClick={() => setStep('details')}
                                disabled={!selectedSlot}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                Continue <ArrowRight size={18} />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Enter Details */}
                {step === 'details' && selectedSlot && (
                    <div className="p-6 space-y-6">
                        <h3 className="text-lg font-semibold text-gray-800">Appointment Details</h3>

                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Doctor:</span>
                                <span className="font-medium">{doctorName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Type:</span>
                                <span className="font-medium capitalize">{appointmentType}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Date:</span>
                                <span className="font-medium">{formatDate(selectedSlot.slot_date)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Time:</span>
                                <span className="font-medium">{formatTime(selectedSlot.slot_start_time)} - {formatTime(selectedSlot.slot_end_time)}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
                                <span className="text-gray-600 font-medium">Consultation Fee:</span>
                                <span className="font-bold text-blue-600">৳{selectedSlot.consultation_fee}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason for Visit / Symptoms (Optional)
                            </label>
                            <textarea
                                value={symptoms}
                                onChange={(e) => setSymptoms(e.target.value)}
                                rows={4}
                                placeholder="Describe your symptoms or reason for visit..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('slot')}
                                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                Back
                            </button>
                            <Button
                                onClick={handleBookAppointment}
                                disabled={loading}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Booking...' : 'Confirm Booking'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 4: Success */}
                {step === 'success' && bookedAppointment && (
                    <div className="p-6 space-y-6">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                                <CheckCircle size={32} className="text-green-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">
                                Booking Confirmed! 🎉
                            </h3>
                            <p className="text-gray-600">
                                Your appointment has been successfully booked
                            </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Queue Number:</span>
                                <span className="font-bold text-2xl text-blue-600">#{bookedAppointment.queueNumber}</span>
                            </div>
                            <div className="border-t border-blue-200 pt-3 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Doctor:</span>
                                    <span className="font-medium">{bookedAppointment.doctorName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Date:</span>
                                    <span className="font-medium">{formatDate(bookedAppointment.date)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Time:</span>
                                    <span className="font-medium">{formatTime(bookedAppointment.startTime)} - {formatTime(bookedAppointment.endTime)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Type:</span>
                                    <span className="font-medium capitalize">{bookedAppointment.appointmentType}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-sm text-yellow-800">
                                <span className="font-semibold">Important:</span> Please arrive 10 minutes early for your appointment. 
                                You can track your queue status in the "My Appointments" section.
                            </p>
                        </div>

                        <Button
                            onClick={handleComplete}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg flex items-center justify-center gap-2"
                        >
                            Go to My Appointments <ArrowRight size={18} />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
