const emailjs = require('@emailjs/nodejs');
require('dotenv').config();

const sendConfirmationEmail = async (bookingData) => {
    try {
        const templateParams = {
            to_name: bookingData.customer_name,
            to_email: bookingData.email,
            sport: bookingData.sport_name,
            date: new Date(bookingData.booking_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            startTime: formatTimeToAMPM(bookingData.start_time),
            endTime: formatTimeToAMPM(bookingData.end_time),
            people: bookingData.people_count,
            amount: bookingData.amount,
            booking_id: bookingData.id,
            phone: bookingData.phone
        };

        await emailjs.send(
            process.env.EMAILJS_SERVICE_ID,
            process.env.EMAILJS_TEMPLATE_ID,
            templateParams,
            {
                publicKey: process.env.EMAILJS_PUBLIC_KEY,
            }
        );

        console.log('Confirmation email sent successfully');
        return { success: true };
    } catch (error) {
        console.error('Email sending failed:', error);
        return { success: false, error: error.message };
    }
};

const sendApprovalEmail = async (bookingData) => {
    try {
        const templateParams = {
            to_name: bookingData.customer_name,
            to_email: bookingData.email,
            sport: bookingData.sport_name,
            date: new Date(bookingData.booking_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            startTime: formatTimeToAMPM(bookingData.start_time),
            endTime: formatTimeToAMPM(bookingData.end_time),
            booking_id: bookingData.id,
            status: 'APPROVED'
        };

        await emailjs.send(
            process.env.EMAILJS_SERVICE_ID,
            process.env.EMAILJS_TEMPLATE_ID,
            templateParams,
            {
                publicKey: process.env.EMAILJS_PUBLIC_KEY,
            }
        );

        console.log('Approval email sent successfully');
        return { success: true };
    } catch (error) {
        console.error('Approval email failed:', error);
        return { success: false, error: error.message };
    }
};

// Helper function to format time
function formatTimeToAMPM(time24) {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

module.exports = {
    sendConfirmationEmail,
    sendApprovalEmail
};
