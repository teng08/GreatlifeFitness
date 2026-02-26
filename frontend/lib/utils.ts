// Utility functions for the GreatLife Booking System

export function formatTimeToAMPM(time24: string): string {
    if (!time24) return 'Invalid Time';

    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);

    if (isNaN(hour)) return 'Invalid Time';

    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;

    return `${hour12}:${minutes} ${ampm}`;
}

export function formatDate(dateString: string): string {
    if (!dateString) return 'Invalid Date';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';

        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return 'Invalid Date';
    }
}

export function formatDateLong(dateString: string): string {
    if (!dateString) return 'Invalid Date';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';

        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return 'Invalid Date';
    }
}

export function formatCurrency(amount: number): string {
    return `₱${amount.toFixed(2)}`;
}

export function getAvailableDates(daysAhead: number = 3): string[] {
    const dates: string[] = [];
    const today = new Date();

    for (let i = 0; i < daysAhead; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
    }

    return dates;
}

export function isValidEmail(email: string): boolean {
    const validDomains = [
        'gmail.com',
        'yahoo.com',
        'outlook.com',
        'hotmail.com',
        'aol.com',
        'icloud.com',
        'protonmail.com',
        'zoho.com',
        'mail.com',
        'yandex.com'
    ];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;

    const domain = email.split('@')[1].toLowerCase();
    return validDomains.includes(domain);
}

export function isValidPhone(phone: string): boolean {
    return /^[0-9]{11}$/.test(phone);
}

export function validateTimeSlot(
    startTime: string,
    endTime: string
): { valid: boolean; error?: string } {
    const timeToMinutes = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const operatingStart = timeToMinutes('08:00');
    const operatingEnd = timeToMinutes('22:00');

    if (startMinutes < operatingStart || endMinutes > operatingEnd) {
        return {
            valid: false,
            error: 'Booking times must be within operating hours (8:00 AM - 10:00 PM)'
        };
    }

    if (endMinutes <= startMinutes) {
        return {
            valid: false,
            error: 'End time must be after start time'
        };
    }

    const duration = endMinutes - startMinutes;
    if (duration > 240) {
        return {
            valid: false,
            error: 'Maximum booking duration is 4 hours'
        };
    }

    if (duration < 60) {
        return {
            valid: false,
            error: 'Minimum booking duration is 1 hour'
        };
    }

    return { valid: true };
}

export function getStatusColor(status: string): string {
    switch (status) {
        case 'confirmed':
            return 'text-green-600 bg-green-100';
        case 'pending':
            return 'text-yellow-600 bg-yellow-100';
        case 'cancelled':
            return 'text-red-600 bg-red-100';
        default:
            return 'text-gray-600 bg-gray-100';
    }
}
