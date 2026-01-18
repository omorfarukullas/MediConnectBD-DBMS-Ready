import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, Edit, X, Check, Video, User } from 'lucide-react';
import api from '../services/apiClient';
import { Button } from '../components/UIComponents';

interface Slot {
    id: number;
    slot_date: string;
    slot_start_time: string;
    slot_end_time: string;
    appointment_type: 'telemedicine' | 'physical';
    max_appointments: number;
    current_bookings: number;
    available_spots: number;
    is_active: boolean;
}

const SlotManagement: React.FC = () => {
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [message, setMessage] = useState<{ type: string; text: string }>({ type: '', text: '' });

    // Form state for adding/editing slots
    const [formData, setFormData] = useState({
        slotDate: '',
        slotStartTime: '',
        slotEndTime: '',
        appointmentType: 'physical' as 'telemedicine' | 'physical',
        maxAppointments: 10,
        recurring: false,
        endDate: ''
    });

    const [filter, setFilter] = useState<'all' | 'telemedicine' | 'physical'>('all');

    useEffect(() => {
        fetchSlots();
    }, []);

    const fetchSlots = async () => {
        try {
            const response = await api.get<{ success: boolean; slots: Slot[] }>('/slots/my-slots?upcoming=true');
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
        
        // Format times to HH:mm:ss for database compatibility
        const payload = {
            ...formData,
            slotStartTime: formatTimeForDB(formData.slotStartTime),
            slotEndTime: formatTimeForDB(formData.slotEndTime)
        };
        
        console.log('📤 Creating slot with data:', payload);
        
        try {
            const response = await api.post('/slots', payload);
            console.log('📥 Response:', response.data);
            
            if (response.data.success) {
                showMessage('success', `✅ ${response.data.message}`);
                setShowAddModal(false);
                resetForm();
                fetchSlots();
            }
        } catch (error: any) {
            console.error('❌ Error creating slot:', error);
            console.error('❌ Error response:', error.response?.data);
            showMessage('error', error.response?.data?.message || 'Failed to create slot');
        }
    };

    const handleToggleSlot = async (id: number, currentStatus: boolean) => {
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
        if (!confirm('Are you sure you want to delete this slot?')) return;

        try {
            await api.delete(`/slots/${id}`);
            showMessage('success', 'Slot deleted successfully');
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
            slotDate: '',
            slotStartTime: '',
            slotEndTime: '',
            appointmentType: 'physical',
            maxAppointments: 10,
            recurring: false,
            endDate: ''
        });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    const formatTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const getTodayDate = () => {
        return new Date().toISOString().split('T')[0];
    };

    const formatTimeForDB = (timeStr: string) => {
        // Convert HH:mm to HH:mm:ss format for database
        if (timeStr && timeStr.length === 5) {
            return timeStr + ':00';
        }
        return timeStr;
    };

    const filteredSlots = slots.filter(slot => {
        if (filter === 'all') return true;
        return slot.appointment_type === filter;
    });

    const groupedSlots = filteredSlots.reduce((acc, slot) => {
        const date = slot.slot_date.split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(slot);
        return acc;
    }, {} as Record<string, Slot[]>);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Appointment Slots</h2>
                    <p className="text-gray-600 mt-1">Manage your availability for patient appointments</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={() => {
                            setFormData({ ...formData, appointmentType: 'physical' });
                            setShowAddModal(true);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg flex items-center gap-2"
                    >
                        <User size={20} />
                        <Plus size={18} />
                        Physical Slot
                    </Button>
                    <Button
                        onClick={() => {
                            setFormData({ ...formData, appointmentType: 'telemedicine' });
                            setShowAddModal(true);
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-lg flex items-center gap-2"
                    >
                        <Video size={20} />
                        <Plus size={18} />
                        Telemedicine Slot
                    </Button>
                </div>
            </div>

            {/* Message Display */}
            {message.text && (
                <div className={`mb-4 p-4 rounded-lg ${
                    message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 
                    'bg-red-50 text-red-800 border border-red-200'
                }`}>
                    {message.text}
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium ${
                        filter === 'all' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    All Slots ({slots.length})
                </button>
                <button
                    onClick={() => setFilter('physical')}
                    className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                        filter === 'physical' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    <User size={16} />
                    Physical ({slots.filter(s => s.appointment_type === 'physical').length})
                </button>
                <button
                    onClick={() => setFilter('telemedicine')}
                    className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                        filter === 'telemedicine' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    <Video size={16} />
                    Telemedicine ({slots.filter(s => s.appointment_type === 'telemedicine').length})
                </button>
            </div>

            {/* Slots List */}
            <div className="space-y-6">
                {Object.keys(groupedSlots).length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <Calendar size={48} className="mx-auto text-gray-400 mb-3" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No slots available</h3>
                        <p className="text-gray-500">Click "Add Slot" to create your first appointment slot</p>
                    </div>
                ) : (
                    Object.entries(groupedSlots).map(([date, dateSlots]) => (
                        <div key={date} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Calendar size={20} className="text-blue-600" />
                                {formatDate(date)}
                            </h3>
                            <div className="space-y-3">
                                {dateSlots.map(slot => (
                                    <div 
                                        key={slot.id} 
                                        className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                                            slot.is_active 
                                                ? 'border-blue-200 bg-blue-50' 
                                                : 'border-gray-200 bg-gray-50 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            {/* Type Icon */}
                                            <div className={`p-3 rounded-full ${
                                                slot.appointment_type === 'telemedicine' 
                                                    ? 'bg-purple-100 text-purple-600' 
                                                    : 'bg-green-100 text-green-600'
                                            }`}>
                                                {slot.appointment_type === 'telemedicine' ? (
                                                    <Video size={20} />
                                                ) : (
                                                    <User size={20} />
                                                )}
                                            </div>

                                            {/* Slot Info */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg font-semibold text-gray-800">
                                                        {formatTime(slot.slot_start_time)} - {formatTime(slot.slot_end_time)}
                                                    </span>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                        slot.appointment_type === 'telemedicine'
                                                            ? 'bg-purple-100 text-purple-700'
                                                            : 'bg-green-100 text-green-700'
                                                    }`}>
                                                        {slot.appointment_type === 'telemedicine' ? 'Telemedicine' : 'Physical'}
                                                    </span>
                                                    {!slot.is_active && (
                                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-2 flex items-center gap-4 text-sm">
                                                    <span className="text-gray-600">
                                                        <span className="font-medium text-blue-600">{slot.current_bookings}</span>
                                                        /{slot.max_appointments} booked
                                                    </span>
                                                    <span className={`font-medium ${
                                                        slot.available_spots > 0 ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                        {slot.available_spots} spots available
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleToggleSlot(slot.id, slot.is_active)}
                                                className={`p-2 rounded-lg ${
                                                    slot.is_active 
                                                        ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                                                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                                                }`}
                                                title={slot.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                {slot.is_active ? <X size={18} /> : <Check size={18} />}
                                            </button>
                                            {slot.current_bookings === 0 && (
                                                <button
                                                    onClick={() => handleDeleteSlot(slot.id)}
                                                    className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
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
                            <h3 className="text-xl font-bold text-gray-800">Create Appointment Slot</h3>
                            <button
                                onClick={() => { setShowAddModal(false); resetForm(); }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSlot} className="p-6 space-y-4">
                            {/* Appointment Type Display */}
                            <div className={`p-4 rounded-lg border-2 ${
                                formData.appointmentType === 'telemedicine'
                                    ? 'border-purple-300 bg-purple-50'
                                    : 'border-green-300 bg-green-50'
                            }`}>
                                <div className="flex items-center gap-3">
                                    {formData.appointmentType === 'telemedicine' ? (
                                        <>
                                            <Video size={24} className="text-purple-600" />
                                            <div>
                                                <span className="font-semibold text-purple-900">Telemedicine Appointment</span>
                                                <p className="text-sm text-purple-700">Video consultation slot</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <User size={24} className="text-green-600" />
                                            <div>
                                                <span className="font-semibold text-green-900">Physical Appointment</span>
                                                <p className="text-sm text-green-700">In-person consultation slot</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Start Date *
                                </label>
                                <input
                                    type="date"
                                    min={getTodayDate()}
                                    value={formData.slotDate}
                                    onChange={(e) => setFormData({ ...formData, slotDate: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
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

                            {/* Max Appointments */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Maximum Appointments
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={formData.maxAppointments}
                                    onChange={(e) => setFormData({ ...formData, maxAppointments: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">How many patients can book this slot</p>
                            </div>

                            {/* Recurring */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.recurring}
                                        onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <div>
                                        <span className="font-medium text-gray-800">Make this recurring</span>
                                        <p className="text-xs text-gray-600">Create this slot for every week on the same day</p>
                                    </div>
                                </label>

                                {formData.recurring && (
                                    <div className="mt-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Repeat Until
                                        </label>
                                        <input
                                            type="date"
                                            min={formData.slotDate || getTodayDate()}
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required={formData.recurring}
                                        />
                                    </div>
                                )}
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
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Create Slot
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
