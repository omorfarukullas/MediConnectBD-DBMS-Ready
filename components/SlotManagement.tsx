import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, Edit, X, Check, Video, User } from 'lucide-react';
import api from '../services/apiClient';
import { Button } from '../components/UIComponents';

interface Slot {
    id: number;
    day_of_week: string;
    start_time: string;
    end_time: string;
    consultation_type: 'TELEMEDICINE' | 'PHYSICAL' | 'BOTH';
    max_patients: number;
    is_active: number;
}

const SlotManagement: React.FC = () => {
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [message, setMessage] = useState<{ type: string; text: string }>({ type: '', text: '' });

    // Simplified form state - direct day selection
    const [formData, setFormData] = useState({
        dayOfWeek: 'SATURDAY' as 'SATURDAY' | 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY',
        slotStartTime: '',
        slotEndTime: '',
        appointmentType: 'physical' as 'telemedicine' | 'physical',
        maxAppointments: 40
    });

    const [filter, setFilter] = useState<'all' | 'telemedicine' | 'physical'>('all');

    const daysOfWeek = [
        { value: 'SATURDAY', label: 'Saturday', emoji: '🌅' },
        { value: 'SUNDAY', label: 'Sunday', emoji: '☀️' },
        { value: 'MONDAY', label: 'Monday', emoji: '📅' },
        { value: 'TUESDAY', label: 'Tuesday', emoji: '📆' },
        { value: 'WEDNESDAY', label: 'Wednesday', emoji: '📋' },
        { value: 'THURSDAY', label: 'Thursday', emoji: '📊' },
        { value: 'FRIDAY', label: 'Friday', emoji: '🎉' }
    ];

    useEffect(() => {
        fetchSlots();
    }, []);

    const fetchSlots = async () => {
        try {
            const response = await api.get<{ success: boolean; slots: Slot[] }>('/slots/my-slots');
            if (response.data.success) {
                setSlots(response.data.slots);
            }
        } catch (error: any) {
            console.error('Error fetching slots:', error);
            showMessage('error', 'Failed to load slots');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSlot = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            dayOfWeek: formData.dayOfWeek,
            startTime: formatTimeForDB(formData.slotStartTime),
            endTime: formatTimeForDB(formData.slotEndTime),
            consultationType: formData.appointmentType.toUpperCase(),
            maxPatients: formData.maxAppointments,
        };

        console.log('📤 Creating weekly slot rule:', payload);

        try {
            const response = await api.post('/slots', payload);

            if (response.data.success) {
                showMessage('success', `✅ ${response.data.message}`);
                setShowAddModal(false);
                resetForm();
                fetchSlots();
            }
        } catch (error: any) {
            console.error('❌ Error creating slot:', error);
            showMessage('error', error.response?.data?.message || 'Failed to create slot');
        }
    };

    const handleToggleSlot = async (id: number, currentStatus: number) => {
        try {
            await api.put(`/slots/${id}`, { isActive: !currentStatus });
            showMessage('success', `Slot ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
            fetchSlots();
        } catch (error: any) {
            console.error('Error toggling slot:', error);
            showMessage('error', error.response?.data?.message || 'Failed to update slot');
        }
    };

    const handleDeleteSlot = async (id: number) => {
        if (!confirm('Are you sure you want to delete this weekly slot rule?')) return;

        try {
            await api.delete(`/slots/${id}`);
            showMessage('success', 'Slot rule deleted successfully');
            fetchSlots();
        } catch (error: any) {
            console.error('Error deleting slot:', error);
            showMessage('error', error.response?.data?.message || 'Failed to delete slot');
        }
    };

    const showMessage = (type: string, text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    };

    const resetForm = () => {
        setFormData({
            dayOfWeek: 'SATURDAY',
            slotStartTime: '',
            slotEndTime: '',
            appointmentType: 'physical',
            maxAppointments: 40
        });
    };

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const formatTimeForDB = (timeStr: string) => {
        if (timeStr && timeStr.length === 5) return timeStr + ':00';
        return timeStr;
    };

    const filteredSlots = slots.filter(slot => {
        if (filter === 'all') return true;
        return slot.consultation_type === filter.toUpperCase() || slot.consultation_type === 'BOTH';
    });

    const groupedSlots = filteredSlots.reduce((acc, slot) => {
        const day = slot.day_of_week;
        if (!acc[day]) acc[day] = [];
        acc[day].push(slot);
        return acc;
    }, {} as Record<string, Slot[]>);

    const dayOrder = ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-6 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
                <div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">Weekly Availability Schedule</h2>
                    <p className="text-gray-600 mt-1 text-xs sm:text-sm">Manage your recurring weekly availability rules</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                    <Button
                        onClick={() => {
                            setFormData({ ...formData, appointmentType: 'physical' });
                            setShowAddModal(true);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-5 py-2 sm:py-3 rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
                    >
                        <User size={18} /> <Plus size={16} /> <span className="hidden sm:inline">Add Physical Slot</span><span className="sm:hidden">Physical</span>
                    </Button>
                    <Button
                        onClick={() => {
                            setFormData({ ...formData, appointmentType: 'telemedicine' });
                            setShowAddModal(true);
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 sm:px-5 py-2 sm:py-3 rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
                    >
                        <Video size={18} /> <Plus size={16} /> <span className="hidden sm:inline">Add Telemed Slot</span><span className="sm:hidden">Telemed</span>
                    </Button>
                </div>
            </div>

            {/* Message Display */}
            {message.text && (
                <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                    'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Slots List Grouped by Day */}
            <div className="space-y-4 sm:space-y-6">
                {Object.keys(groupedSlots).length === 0 ? (
                    <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg">
                        <Calendar size={40} className="mx-auto text-gray-400 mb-3" />
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">No weekly schedule set</h3>
                        <p className="text-gray-500 text-sm">Create recurring availability rules to start accepting appointments</p>
                    </div>
                ) : (
                    dayOrder.filter(day => groupedSlots[day]).map(day => (
                        <div key={day} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-5">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                                <Calendar size={18} className="text-blue-600" />
                                <span className="capitalize">Every {day.toLowerCase()}</span>
                                <span className="text-xs sm:text-sm font-normal text-gray-500 ml-2">(Recurring Weekly)</span>
                            </h3>
                            <div className="space-y-2 sm:space-y-3">
                                {groupedSlots[day].map(slot => (
                                    <div
                                        key={slot.id}
                                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg border-2 gap-3 ${slot.is_active
                                            ? 'border-blue-200 bg-blue-50'
                                            : 'border-gray-200 bg-gray-50 opacity-60'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full">
                                            <div className={`p-2 sm:p-3 rounded-full flex-shrink-0 ${slot.consultation_type === 'TELEMEDICINE'
                                                ? 'bg-purple-100 text-purple-600'
                                                : slot.consultation_type === 'BOTH'
                                                    ? 'bg-indigo-100 text-indigo-600'
                                                    : 'bg-green-100 text-green-600'
                                                }`}>
                                                {slot.consultation_type === 'TELEMEDICINE' ? <Video size={18} /> : <User size={18} />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-base sm:text-lg font-semibold text-gray-800">
                                                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                                    </span>
                                                    <span className="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-white border border-gray-200 text-gray-600">
                                                        Max {slot.max_patients}
                                                    </span>
                                                    {!slot.is_active && (
                                                        <span className="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-gray-200 text-gray-700">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs sm:text-sm text-gray-500 mt-1 capitalize">
                                                    {slot.consultation_type.toLowerCase()} appointments
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-end sm:self-auto">
                                            <button
                                                onClick={() => handleToggleSlot(slot.id, slot.is_active)}
                                                className={`p-2 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center ${slot.is_active
                                                    ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                                                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                                                    }`}
                                                title={slot.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                {slot.is_active ? <X size={18} /> : <Check size={18} />}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSlot(slot.id)}
                                                className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 min-h-[40px] min-w-[40px] flex items-center justify-center"
                                                title="Delete Weekly Rule"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Slot Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">Create Weekly Availability</h3>
                            <button
                                onClick={() => { setShowAddModal(false); resetForm(); }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSlot} className="p-6 space-y-4">
                            {/* Appointment Type Display */}
                            <div className={`p-4 rounded-lg border-2 ${formData.appointmentType === 'telemedicine'
                                ? 'border-purple-300 bg-purple-50'
                                : 'border-green-300 bg-green-50'
                                }`}>
                                <div className="flex items-center gap-3">
                                    {formData.appointmentType === 'telemedicine' ? (
                                        <>
                                            <Video size={24} className="text-purple-600" />
                                            <div>
                                                <span className="font-semibold text-purple-900">Telemedicine Session</span>
                                                <p className="text-sm text-purple-700">Video consultation slot</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <User size={24} className="text-green-600" />
                                            <div>
                                                <span className="font-semibold text-green-900">Physical Visit Session</span>
                                                <p className="text-sm text-green-700">In-person consultation slot</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Day of Week Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Day of Week *
                                </label>
                                <select
                                    value={formData.dayOfWeek}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        dayOfWeek: e.target.value as typeof formData.dayOfWeek
                                    })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                                    required
                                >
                                    {daysOfWeek.map(day => (
                                        <option key={day.value} value={day.value}>
                                            {day.emoji} {day.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                                    <span>ℹ️</span>
                                    <span>This slot will repeat every {daysOfWeek.find(d => d.value === formData.dayOfWeek)?.label}</span>
                                </p>
                            </div>

                            {/* Time Range */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Start Time *
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.slotStartTime}
                                        onChange={(e) => setFormData({ ...formData, slotStartTime: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        End Time *
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.slotEndTime}
                                        onChange={(e) => setFormData({ ...formData, slotEndTime: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Max Patients */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Maximum Patients per Session
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={formData.maxAppointments}
                                    onChange={(e) => setFormData({ ...formData, maxAppointments: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">Queue capacity for each session</p>
                            </div>

                            {/* Info Box */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    <span className="font-semibold">Recurring Rule:</span> This will create appointments every{' '}
                                    <span className="font-semibold">{daysOfWeek.find(d => d.value === formData.dayOfWeek)?.label}</span>{' '}
                                    from{' '}
                                    <span className="font-semibold">{formData.slotStartTime || '__:__'}</span>{' '}
                                    to{' '}
                                    <span className="font-semibold">{formData.slotEndTime || '__:__'}</span>.
                                    Patients will be able to book appointments on upcoming {daysOfWeek.find(d => d.value === formData.dayOfWeek)?.label}s.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowAddModal(false); resetForm(); }}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                >
                                    Create Weekly Rule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SlotManagement;
