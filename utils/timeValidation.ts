/**
 * Time Validation Utilities
 * Handles appointment time validation and date grouping
 */

import { Appointment } from '../types';

/**
 * Check if current time is within appointment window
 * @param appointmentTime - Combined date and time string (e.g., "2024-01-18 10:00:00")
 * @param bufferMinutes - Buffer time before/after appointment (default: 15 minutes)
 * @returns boolean - true if current time is within valid window
 */
export const isAppointmentActive = (
  appointmentTime: string, 
  bufferMinutes: number = 15
): boolean => {
  try {
    const appointmentDate = new Date(appointmentTime);
    const currentDate = new Date();

    // Calculate time window (appointment time ± buffer)
    const startTime = new Date(appointmentDate.getTime() - bufferMinutes * 60000);
    const endTime = new Date(appointmentDate.getTime() + bufferMinutes * 60000);

    // Check if current time falls within the window
    return currentDate >= startTime && currentDate <= endTime;
  } catch (error) {
    console.error('Error validating appointment time:', error);
    return false;
  }
};

/**
 * Check if appointment time is in the future
 * @param appointmentTime - Combined date and time string
 * @returns boolean
 */
export const isAppointmentUpcoming = (appointmentTime: string): boolean => {
  try {
    const appointmentDate = new Date(appointmentTime);
    const currentDate = new Date();
    return appointmentDate > currentDate;
  } catch (error) {
    return false;
  }
};

/**
 * Check if appointment time has passed
 * @param appointmentTime - Combined date and time string
 * @returns boolean
 */
export const isAppointmentPast = (appointmentTime: string): boolean => {
  try {
    const appointmentDate = new Date(appointmentTime);
    const currentDate = new Date();
    return appointmentDate < currentDate;
  } catch (error) {
    return false;
  }
};

/**
 * Format time for display (e.g., "10:00 AM")
 * @param time24 - 24-hour format time string (e.g., "14:30:00")
 * @returns Formatted time string
 */
export const formatTime = (time24: string): string => {
  try {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  } catch (error) {
    return time24;
  }
};

/**
 * Group appointments by date
 * @param appointments - Array of appointments
 * @returns Object with dates as keys and appointment arrays as values
 */
export const groupAppointmentsByDate = (
  appointments: Appointment[]
): Record<string, Appointment[]> => {
  return appointments.reduce((groups, appointment) => {
    const date = appointment.date.split('T')[0]; // Extract date part only
    
    if (!groups[date]) {
      groups[date] = [];
    }
    
    groups[date].push(appointment);
    return groups;
  }, {} as Record<string, Appointment[]>);
};

/**
 * Get relative date label (Today, Tomorrow, etc.)
 * @param dateString - Date string
 * @returns Relative date label
 */
export const getRelativeDateLabel = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }
};

/**
 * Calculate time remaining until appointment
 * @param appointmentTime - Combined date and time string
 * @returns Human-readable time remaining
 */
export const getTimeUntilAppointment = (appointmentTime: string): string => {
  try {
    const appointmentDate = new Date(appointmentTime);
    const currentDate = new Date();
    const diffMs = appointmentDate.getTime() - currentDate.getTime();

    if (diffMs < 0) {
      return 'Passed';
    }

    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    } else {
      return 'Now';
    }
  } catch (error) {
    return 'Unknown';
  }
};
