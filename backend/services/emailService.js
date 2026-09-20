const emailjs = require('@emailjs/nodejs');
require('dotenv').config();

const requiredEnvironment = [
    'EMAILJS_PUBLIC_KEY',
    'EMAILJS_SERVICE_ID',
    'EMAILJS_TEMPLATE_ID'
];

const paymentStatusLabels = {
    pending: 'Payment pending',
    unpaid: 'Not yet paid',
    paid: 'Paid in full',
    refunded: 'Refunded'
};

const emailStatusContent = {
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

const getEmailConfig = () => {
    const missing = requiredEnvironment.filter((key) => !process.env[key]?.trim());
    if (missing.length > 0) {
        throw new Error(`EmailJS is not configured. Missing: ${missing.join(', ')}`);
    }

    return {
        serviceId: process.env.EMAILJS_SERVICE_ID.trim(),
        templateId: process.env.EMAILJS_TEMPLATE_ID.trim(),
        options: {
            publicKey: process.env.EMAILJS_PUBLIC_KEY.trim(),
            ...(process.env.EMAILJS_PRIVATE_KEY?.trim()
                ? { privateKey: process.env.EMAILJS_PRIVATE_KEY.trim() }
                : {})
        }
    };
};

const formatBookingDate = (dateValue) => {
    const [year, month, day] = String(dateValue).split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (!year || !month || !day || Number.isNaN(date.getTime())) return String(dateValue || '');

    return date.toLocaleDateString('en-PH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

const getErrorMessage = (error) => {
    if (error && typeof error === 'object' && 'text' in error && error.text) {
        return String(error.text);
    }
    return error instanceof Error ? error.message : 'Unknown EmailJS error';
};

const sendBookingEmail = async (bookingData, status) => {
    if (process.env.EMAILJS_SERVER_ENABLED !== 'true') {
        console.log(`[EMAIL] ${status} booking email delegated to browser delivery for booking ${bookingData.id}`);
        return {
            success: false,
            error: 'Email delivery delegated to the browser.'
        };
    }

    try {
        const { serviceId, templateId, options } = getEmailConfig();
        const sportName = bookingData.sport_name
            || bookingData.sports?.display_name
            || bookingData.sports?.name
            || 'Court booking';
        const formattedDate = formatBookingDate(bookingData.booking_date);
        const formattedStartTime = formatTimeToAMPM(bookingData.start_time);
        const formattedEndTime = formatTimeToAMPM(bookingData.end_time);
        const amount = Number(bookingData.amount || 0).toLocaleString('en-PH', {
            style: 'currency',
            currency: 'PHP'
        });
        const emailContent = emailStatusContent[status];

        const templateParams = {
            to_name: bookingData.customer_name,
            customer_name: bookingData.customer_name,
            to_email: bookingData.email,
            email: bookingData.email,
            reply_to: bookingData.email,
            sport: sportName,
            sport_name: sportName,
            date: formattedDate,
            booking_date: formattedDate,
            startTime: formattedStartTime,
            start_time: formattedStartTime,
            endTime: formattedEndTime,
            end_time: formattedEndTime,
            people: bookingData.people_count,
            people_count: bookingData.people_count,
            amount,
            booking_id: bookingData.id,
            phone: bookingData.phone,
            rental_option: bookingData.rental_option || 'Standard',
            payment_method: bookingData.payment_method || 'Cash Payment',
            payment_status: bookingData.payment_status || 'unpaid',
            payment_status_label: paymentStatusLabels[bookingData.payment_status] || 'Payment pending',
            payment_id: bookingData.payment_id || '',
            rejection_reason: bookingData.rejection_reason || '',
            status,
            status_label: emailContent.label,
            status_background: emailContent.background,
            status_color: emailContent.color,
            status_border: emailContent.border,
            email_subject: emailContent.subject(bookingData.id),
            email_preheader: `${emailContent.label}: ${sportName} on ${formattedDate}`,
            email_heading: emailContent.heading,
            email_message: emailContent.message,
            current_year: new Date().getFullYear()
        };

        const response = await emailjs.send(serviceId, templateId, templateParams, options);
        if (response.status !== 200) throw new Error(`EmailJS returned status ${response.status}`);

        console.log(`[EMAIL] ${status} booking email sent for booking ${bookingData.id}`);
        return { success: true, status: response.status };
    } catch (error) {
        const message = getErrorMessage(error);
        console.error(`[EMAIL] ${status} booking email failed for booking ${bookingData.id}:`, message);
        return { success: false, error: message };
    }
};

const sendConfirmationEmail = async (bookingData) => {
    return sendBookingEmail(bookingData, 'PENDING');
};

const sendApprovalEmail = async (bookingData) => {
    return sendBookingEmail(bookingData, 'APPROVED');
};

const sendRejectionEmail = async (bookingData) => {
    return sendBookingEmail(bookingData, 'REJECTED');
};

const sendCancellationEmail = async (bookingData) => {
    return sendBookingEmail(bookingData, 'CANCELLED');
};

const sendPaymentEmail = async (bookingData) => {
    return sendBookingEmail(bookingData, 'PAID');
};

// Helper function to format time
function formatTimeToAMPM(time24) {
    if (!time24 || !String(time24).includes(':')) return String(time24 || '');
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

module.exports = {
    sendConfirmationEmail,
    sendApprovalEmail,
    sendRejectionEmail,
    sendCancellationEmail,
    sendPaymentEmail
};
