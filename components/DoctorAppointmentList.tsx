/**
 * Doctor Appointment List Component
 * Date-grouped appointment list with time-gated access control
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, ChevronDown, ChevronUp, AlertCircle, Video } from 'lucide-react';
import { Card, Button, Badge } from './UIComponents';
import { Appointment } from '../types';
import { isAppointmentActive, formatTime, groupAppointmentsByDate } from '../utils/timeValidation';
import { MedicalHistoryModal } from './MedicalHistoryModal';

interface DoctorAppointmentListProps {
  appointments: Appointment[];
  onRefresh?: () => void;
  onStartCall?: (appointment: Appointment) => void;
}

export const DoctorAppointmentList: React.FC<DoctorAppointmentListProps> = ({
  appointments,
  onRefresh,
  onStartCall
}) => {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [selectedPatient, setSelectedPatient] = useState<{
    appointment: Appointment;
    patientId: number;
  } | null>(null);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute for real-time validation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Group appointments by date
  const groupedAppointments = groupAppointmentsByDate(appointments);

  // Toggle date expansion
  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  // Handle patient click - always allow access
  const handlePatientClick = (appointment: Appointment) => {
    // Open medical history modal immediately
    setSelectedPatient({
      appointment,
      patientId: appointment.patientId || 0
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PENDING': 'yellow',
      'ACCEPTED': 'blue',
      'COMPLETED': 'green',
      'REJECTED': 'red',
      'CANCELLED': 'gray'
    };
    return colors[status] || 'gray';
  };

  return (
    <div className="space-y-4">
      {/* Access Denied Toast */}
      {showAccessDenied && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <Card className="bg-red-50 border-red-200 shadow-lg max-w-md">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <div>
                <h4 className="font-semibold text-red-900">Access Denied</h4>
                <p className="text-sm text-red-700 mt-1">
                  Patient records are only accessible during the scheduled appointment time.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Date-Grouped Appointment List */}
      <div className="space-y-3">
        {Object.entries(groupedAppointments).length === 0 ? (
          <Card className="text-center py-8">
            <Calendar className="mx-auto text-gray-400 mb-3" size={48} />
            <p className="text-gray-600">No appointments scheduled</p>
          </Card>
        ) : (
          Object.entries(groupedAppointments).map(([date, dateAppointments]) => {
            const isExpanded = expandedDates.has(date);
            const dateObj = new Date(date);
            const isToday = dateObj.toDateString() === new Date().toDateString();

            return (
              <Card key={date} className="overflow-hidden">
                {/* Date Header */}
                <button
                  onClick={() => toggleDate(date)}
                  className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`p-1.5 sm:p-2 rounded-lg ${isToday ? 'bg-primary-100' : 'bg-gray-100'}`}>
                      <Calendar className={isToday ? 'text-primary-600' : 'text-gray-600'} size={18} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
                        {dateObj.toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {dateAppointments.length} {dateAppointments.length === 1 ? 'appointment' : 'appointments'}
                      </p>
                    </div>
                    {isToday && (
                      <Badge variant="primary" size="sm">Today</Badge>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {/* Appointment List */}
                {isExpanded && (
                  <div className="border-t border-gray-200 divide-y divide-gray-100">
                    {dateAppointments
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((appointment) => {
                        const appointmentTime = `${appointment.date} ${appointment.time}`;
                        const isActive = isAppointmentActive(appointmentTime);
                        const appointmentType = (appointment.consultationType || appointment.type || '').includes('Telemedicine') ? 'Telemedicine' : 'In-Person';

                        return (
                          <button
                            key={appointment.id}
                            onClick={() => handlePatientClick(appointment)}
                            className={`w-full p-3 sm:p-4 hover:bg-gray-50 transition-colors text-left ${isActive ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                              }`}
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2 sm:gap-3 flex-1 w-full">
                                {/* Queue Number */}
                                {appointment.queueNumber && (
                                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-100 flex items-center justify-center">
                                    <span className="font-bold text-primary-600 text-sm sm:text-base">
                                      {appointment.queueNumber}
                                    </span>
                                  </div>
                                )}

                                {/* Patient Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-semibold text-slate-900 text-sm sm:text-base">
                                      {appointment.patientName || 'Unknown Patient'}
                                    </h4>
                                    {isActive && (
                                      <Badge variant="success" size="sm">Active Now</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-600 flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Clock size={14} />
                                      {formatTime(appointment.time)}
                                    </span>
                                    {appointment.reasonForVisit && (
                                      <span className="truncate">
                                        {appointment.reasonForVisit}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Status Badge and Action Button */}
                              <div className="flex flex-col sm:flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                                <Badge variant={getStatusColor(appointment.status as string)}>
                                  {appointment.status}
                                </Badge>

                                {(appointmentType === 'Telemedicine' && (appointment.status === 'CONFIRMED' || appointment.status === 'ACCEPTED')) && (
                                  <Button
                                    size="sm"
                                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm py-2 h-auto min-h-[40px] w-full sm:w-auto flex items-center justify-center gap-1.5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onStartCall) onStartCall(appointment);
                                    }}
                                  >
                                    <Video size={16} /> Start Call
                                  </Button>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Medical History Modal */}
      {selectedPatient && (
        <MedicalHistoryModal
          appointment={selectedPatient.appointment}
          patientId={selectedPatient.patientId}
          onClose={() => setSelectedPatient(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
};
