/**
 * Date and Time Formatting Utilities
 * For patient-facing appointment booking interface
 */

/**
 * Format date as full readable string
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns "Saturday, January 25, 2026"
 */
export const formatFullDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00'); // Prevent timezone issues
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

/**
 * Format date as short readable string
 * @param dateStr - ISO date string (YYYY-MM-DD)  
 * @returns "Sat, Jan 25"
 */
export const formatShortDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
};

/**
 * Format time from HH:mm:ss to readable format
 * @param timeStr - Time string (HH:mm:ss or HH:mm)
 * @returns "9:00 AM"
 */
export const formatTime = (timeStr: string): string => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
};

/**
 * Get capacity color based on availability
 * @param available - Number of spots available
 * @param max - Maximum capacity
 * @returns Tailwind color class
 */
export const getCapacityColor = (available: number, max: number): string => {
    const percentage = (available / max) * 100;
    if (percentage > 50) return 'text-green-600';
    if (percentage > 20) return 'text-yellow-600';
    return 'text-red-600';
};

/**
 * Get capacity status text
 * @param available - Number of spots available
 * @returns Status text
 */
export const getCapacityStatus = (available: number): string => {
    if (available === 0) return 'Fully Booked';
    if (available <= 3) return `Only ${available} spots left!`;
    return `${available} spots available`;
};

/**
 * Check if date is today
 * @param dateStr - ISO date string
 * @returns boolean
 */
export const isToday = (dateStr: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
};

/**
 * Check if date is tomorrow
 * @param dateStr - ISO date string
 * @returns boolean
 */
export const isTomorrow = (dateStr: string): boolean => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return dateStr === tomorrow.toISOString().split('T')[0];
};

/**
 * Get relative date label
 * @param dateStr - ISO date string
 * @returns "Today", "Tomorrow", or formatted date
 */
export const getDateLabel = (dateStr: string): string => {
    if (isToday(dateStr)) return 'Today';
    if (isTomorrow(dateStr)) return 'Tomorrow';
    return formatFullDate(dateStr);
};
