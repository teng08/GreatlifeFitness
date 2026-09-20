import type { Booking } from './types';
import { formatCurrency, formatDateLong, formatTimeToAMPM } from './utils';

export type BookingEmailStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'PAID';

export interface EmailDeliveryResult {
    sent: boolean;
    error?: string;
}

const EMAILJS_SEND_URL = 'https://api.emailjs.com/api/v1.0/email/send';

const PAYMENT_STATUS_LABELS: Record<Booking['payment_status'], string> = {
    pending: 'Payment pending',
    unpaid: 'Not yet paid',
    paid: 'Paid in full',
    refunded: 'Refunded'
};

const EMAIL_STATUS_CONTENT: Record<BookingEmailStatus, {
    subject: (bookingId: number) => string;
    heading: string;
    message: string;
    label: string;
    background: string;
    color: string;
    border: string;
}> = {
    PENDING: {
        subject: (bookingId) => `Booking #${bookingId} received | GreatLife Fitness`,
        heading: 'Your booking request is in',
        message: 'Thanks for choosing GreatLife Fitness. Our team is reviewing your requested schedule and will send another email as soon as it is approved.',
        label: 'Pending review',
        background: '#fff4d6',
        color: '#8a5b00',
        border: '#f4c46b'
    },
    APPROVED: {
        subject: (bookingId) => `Booking #${bookingId} confirmed | GreatLife Fitness`,
        heading: 'Your court is confirmed',
        message: 'Great news—your reservation has been approved. Please arrive 10 minutes before your scheduled time so our team can help you get ready.',
        label: 'Confirmed',
        background: '#e3f6ed',
        color: '#12633f',
        border: '#69c79b'
    },
    REJECTED: {
        subject: (bookingId) => `Update for booking #${bookingId} | GreatLife Fitness`,
        heading: 'We could not confirm this schedule',
        message: 'Unfortunately, we cannot approve this booking request. Please review the note below and submit another schedule that works for you.',
        label: 'Not approved',
        background: '#ffe8e8',
        color: '#963737',
        border: '#e89a9a'
    },
    CANCELLED: {
        subject: (bookingId) => `Booking #${bookingId} cancelled | GreatLife Fitness`,
        heading: 'Your booking was cancelled',
        message: 'This reservation is no longer active. If you would still like to play, please submit a new booking for your preferred schedule.',
        label: 'Cancelled',
        background: '#f1edfb',
        color: '#5b3e98',
        border: '#bda9e5'
    },
    PAID: {
        subject: (bookingId) => `Payment received for booking #${bookingId} | GreatLife Fitness`,
        heading: 'Your payment was received',
        message: 'Your payment has been recorded successfully. Your booking remains confirmed, and we look forward to welcoming you to GreatLife Fitness.',
        label: 'Paid',
        background: '#e3f6ed',
        color: '#12633f',
        border: '#69c79b'
    }
};

export async function sendBookingEmailFromBrowser(
    booking: Booking,
    status: BookingEmailStatus
): Promise<EmailDeliveryResult> {
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY?.trim();
    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID?.trim();
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID?.trim();

    if (!publicKey || !serviceId || !templateId) {
        return {
            sent: false,
            error: 'EmailJS browser configuration is incomplete.'
        };
    }

    const sportName = booking.sports?.display_name
        || booking.sports?.name
        || 'Court booking';
    const emailContent = EMAIL_STATUS_CONTENT[status];

    try {
        const response = await fetch(EMAILJS_SEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                service_id: serviceId,
                template_id: templateId,
                user_id: publicKey,
                template_params: {
                    to_name: booking.customer_name,
                    customer_name: booking.customer_name,
                    to_email: booking.email,
                    email: booking.email,
                    reply_to: booking.email,
                    sport: sportName,
                    sport_name: sportName,
                    date: formatDateLong(booking.booking_date),
                    booking_date: formatDateLong(booking.booking_date),
                    startTime: formatTimeToAMPM(booking.start_time),
                    start_time: formatTimeToAMPM(booking.start_time),
                    endTime: formatTimeToAMPM(booking.end_time),
                    end_time: formatTimeToAMPM(booking.end_time),
                    people: booking.people_count,
                    people_count: booking.people_count,
                    amount: formatCurrency(Number(booking.amount)),
                    booking_id: booking.id,
                    phone: booking.phone,
                    rental_option: booking.rental_option || 'Standard',
                    payment_method: booking.payment_method || 'Cash Payment',
                    payment_status: booking.payment_status || 'unpaid',
                    payment_status_label: PAYMENT_STATUS_LABELS[booking.payment_status] || 'Payment pending',
                    payment_id: booking.payment_id || '',
                    rejection_reason: booking.rejection_reason || '',
                    status,
                    status_label: emailContent.label,
                    status_background: emailContent.background,
                    status_color: emailContent.color,
                    status_border: emailContent.border,
                    email_subject: emailContent.subject(booking.id),
                    email_preheader: `${emailContent.label}: ${sportName} on ${formatDateLong(booking.booking_date)}`,
                    email_heading: emailContent.heading,
                    email_message: emailContent.message,
                    current_year: new Date().getFullYear()
                }
            })
        });

        const responseText = await response.text();
        if (!response.ok) {
            throw new Error(responseText || `EmailJS returned status ${response.status}`);
        }

        return { sent: true };
    } catch (error) {
        return {
            sent: false,
            error: error instanceof Error ? error.message : 'Unknown EmailJS error'
        };
    }
}
