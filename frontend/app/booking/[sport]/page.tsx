'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api';
import type { Sport, CreateBookingData, BlockedSlot } from '@/lib/types';
import {
    getAvailableDates,
    formatDateLong,
    formatTimeToAMPM,
    formatCurrency,
    isValidEmail,
    isValidPhone,
    validateTimeSlot
} from '@/lib/utils';
import emailjs from '@emailjs/browser';

export default function BookingPage({ params }: { params: Promise<{ sport: string }> }) {
    const { sport: sportParam } = use(params);
    const normalizeSportKey = (value?: string | null) =>
        (value || '').toLowerCase().trim().replace(/\s+/g, '-');
    const sportKey = normalizeSportKey(sportParam);
    const router = useRouter();
    const [sport, setSport] = useState<Sport | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingId, setBookingId] = useState('');

    const [formData, setFormData] = useState({
        customer_name: '',
        email: '',
        phone: '',
        people_count: 1,
        start_time: '',
        end_time: '',
        rental_option: ''
    });

    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);

    const DATA_PRIVACY_REFERENCE = 'Republic Act No. 10173 (Data Privacy Act of 2012), including applicable Section 23 provisions and IRR requirements';

    const RENTAL_OPTIONS = [
        { label: 'Court + Middle Lights (₱500/hr)', value: 'middle-lights', price: 500 },
        { label: 'Court + Full Lights (₱700/hr)', value: 'full-lights', price: 700 },
        { label: 'Court + Middle Lights + AC (₱800/hr)', value: 'middle-lights-ac', price: 800 },
        { label: 'Court + Full Lights + AC (₱1,000/hr)', value: 'full-lights-ac', price: 1000 },
    ];

    const VALID_EMAIL_DOMAINS = [
        'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
        'aol.com', 'icloud.com', 'protonmail.com', 'zoho.com',
        'mail.com', 'yandex.com'
    ];

    const SPORT_BASE_PRICES: Record<string, number> = {
        'basketball': 800,
        'badminton': 600,
        'table-tennis': 400
    };

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [currentSlide, setCurrentSlide] = useState(0);

    const SPORT_IMAGES: Record<string, string[]> = {
        'basketball': ['/court_images/basketball_1.jpg', '/court_images/basketball_2.jpg', '/images/bbcourt.jpg'],
        'table-tennis': ['/court_images/ping_pong1.jpg', '/court_images/ping_pong2.jpg', '/images/ttcourt.jpg'],
        'badminton': ['/court_images/Badminton.jpg', '/court_images/Badminton2.jpg', '/images/bmcourt.jpg'],
    };

    const courtImages = sportKey ? (SPORT_IMAGES[sportKey] || ['/images/gym.jpg']) : ['/images/gym.jpg'];

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % courtImages.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + courtImages.length) % courtImages.length);
    };

    const availableDates = getAvailableDates(3);

    const loadSport = async () => {
        setLoading(true);
        const [sportResponse, blockedResponse] = await Promise.all([
            api.getSports(),
            api.getBlockedSlots()
        ]);

        if (sportResponse.success && sportResponse.data) {
            const foundSport = sportResponse.data.find((s) => {
                const normalizedName = normalizeSportKey(s.name);
                const normalizedDisplay = normalizeSportKey(s.display_name);
                return normalizedName === sportKey || normalizedDisplay === sportKey;
            });
            if (foundSport) {
                setSport(foundSport);
            }
        }

        if (blockedResponse.success && blockedResponse.data) {
            setBlockedSlots(blockedResponse.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadSport();
        // Initialize EmailJS
        emailjs.init(process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '');
    }, [sportParam]);

    useEffect(() => {
        if (loading || !sport) return;

        // Scroll animation logic
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        }, { threshold: 0.1 });

        const animElements = document.querySelectorAll('.js-animate-on-scroll');
        animElements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, [loading, sport, bookingSuccess]);

    const timeToMinutes = (time: string) => {
        if (!time) return 0;
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const minutesToTime = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'start_time') {
            const startMins = timeToMinutes(value);
            const operatingEnd = timeToMinutes('22:00');

            // Suggest an end time 1 hour after start
            const suggestedEndMins = Math.min(startMins + 60, operatingEnd);

            setFormData(prev => ({
                ...prev,
                [name]: value,
                end_time: minutesToTime(suggestedEndMins)
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.customer_name.trim()) {
            newErrors.customer_name = 'Name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!isValidEmail(formData.email)) {
            newErrors.email = 'Invalid email address';
        } else {
            const domain = formData.email.split('@')[1]?.toLowerCase();
            if (!VALID_EMAIL_DOMAINS.includes(domain)) {
                newErrors.email = 'Please use a valid email (Gmail, Yahoo, Outlook, etc.)';
            }
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!isValidPhone(formData.phone)) {
            newErrors.phone = 'Phone number must be exactly 11 digits';
        }

        if (formData.people_count < 1 || formData.people_count > 15) {
            newErrors.people_count = `Number of people must be between 1 and 15`;
        }

        // Only require rental option for certain sports (Basketball/Badminton usually have options)
        const selectedSportKey = normalizeSportKey(sport?.name);
        if (!formData.rental_option && (selectedSportKey === 'basketball' || selectedSportKey === 'badminton')) {
            newErrors.rental_option = 'Please select a rental option';
        }

        if (!selectedDate) {
            newErrors.date = 'Please select a date';
        }

        if (!formData.start_time || !formData.end_time) {
            newErrors.time = 'Please select both start and end times';
        } else {
            const timeValidation = validateTimeSlot(formData.start_time, formData.end_time);
            if (!timeValidation.valid) {
                newErrors.time = timeValidation.error || 'Invalid time slot';
            } else {
                // Check if the selected time overlaps with any blocked slot
                const selectedStartMins = timeToMinutes(formData.start_time);
                const selectedEndMins = timeToMinutes(formData.end_time);

                const isOverlapping = blockedSlots.some(slot => {
                    if (slot.booking_date !== selectedDate) return false;
                    // If sport_id is null, it applies to all sports
                    if (slot.sport_id && slot.sport_id !== sport?.id) return false;

                    const blockStart = timeToMinutes(slot.start_time);
                    const blockEnd = timeToMinutes(slot.end_time);

                    return (selectedStartMins < blockEnd && selectedEndMins > blockStart);
                });

                if (isOverlapping) {
                    newErrors.time = 'This time slot overlaps with a blocked period. Please check the unavailable times.';
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleBookNow = () => {
        if (validateForm()) {
            setShowConfirmation(true);
        }
    };

    useEffect(() => {
        if (termsAccepted && privacyAccepted && errors.agreements) {
            setErrors(prev => ({ ...prev, agreements: '' }));
        }
    }, [termsAccepted, privacyAccepted, errors.agreements]);

    const sendConfirmationEmail = async (bookingData: any) => {
        try {
            const templateParams = {
                customer_name: bookingData.customer_name,
                to_email: bookingData.email,
                sport_name: sport?.display_name || '',
                booking_date: formatDateLong(bookingData.booking_date),
                start_time: formatTimeToAMPM(bookingData.start_time),
                end_time: formatTimeToAMPM(bookingData.end_time),
                people_count: bookingData.people_count,
                amount: formatCurrency(bookingData.amount),
                booking_id: bookingData.id
            };

            await emailjs.send(
                process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
                process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || '',
                templateParams
            );

            console.log('Confirmation email sent successfully');
        } catch (error) {
            console.error('Failed to send confirmation email:', error);
            // Don't block the booking if email fails
        }
    };

    const calculateDuration = () => {
        if (!formData.start_time || !formData.end_time) return 0;
        const startTotal = timeToMinutes(formData.start_time);
        const endTotal = timeToMinutes(formData.end_time);
        return (endTotal - startTotal) / 60;
    };

    const calculateTotalAmount = () => {
        const duration = calculateDuration();
        const option = RENTAL_OPTIONS.find(o => o.value === formData.rental_option);

        // If no rental option selected, use sport base price from original system or fallback
        const normalizedSportName = normalizeSportKey(sport?.name);
        const basePrice = (normalizedSportName && SPORT_BASE_PRICES[normalizedSportName]) || sport?.price || 500;
        const hourlyRate = option ? option.price : basePrice;
        return duration > 0 ? hourlyRate * Math.ceil(duration) : 0;
    };

    const handleConfirmBooking = async () => {
        if (!sport) return;

        setSubmitting(true);
        try {
            const bookingData: CreateBookingData = {
                sport_id: sport.id,
                customer_name: formData.customer_name,
                email: formData.email,
                phone: formData.phone,
                people_count: formData.people_count,
                booking_date: selectedDate,
                start_time: formData.start_time,
                end_time: formData.end_time,
                amount: calculateTotalAmount(),
                rental_option: formData.rental_option || 'Standard'
            };

            const response = await api.createBooking(bookingData);

            if (response.success && response.data) {
                setBookingId(response.data.id.toString());

                // Send confirmation email
                await sendConfirmationEmail({
                    ...bookingData,
                    id: response.data.id
                });

                setShowConfirmation(false);
                setBookingSuccess(true);
            } else {
                alert(response.error || 'Booking failed. Please try again.');
            }
        } catch (error) {
            alert('An error occurred. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!sport) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Sport not found</h1>
                    <button
                        onClick={() => router.push('/')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    if (bookingSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
                <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Booking Confirmed!</h2>
                        <p className="text-gray-600 mb-6">
                            We&apos;ve sent a confirmation message to your email and phone.
                        </p>
                        <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                            <h3 className="font-semibold text-gray-900 mb-4">Your Reservation Details:</h3>
                            <div className="space-y-2 text-gray-700">
                                <p><strong>Sport:</strong> {sport.display_name}</p>
                                <p><strong>Date:</strong> {formatDateLong(selectedDate)}</p>
                                <p><strong>Time:</strong> {formatTimeToAMPM(formData.start_time)} - {formatTimeToAMPM(formData.end_time)}</p>
                                <p><strong>Name:</strong> {formData.customer_name}</p>
                                <p><strong>Email:</strong> {formData.email}</p>
                                <p><strong>Party Size:</strong> {formData.people_count} people</p>
                                <p><strong>Phone:</strong> {formData.phone}</p>
                                <p><strong>Rental Option:</strong> {RENTAL_OPTIONS.find(o => o.value === formData.rental_option)?.label}</p>
                                <p><strong>Payment Method:</strong> Cash Payment</p>
                                <p><strong>Amount:</strong> {formatCurrency(calculateTotalAmount())}</p>
                                <p><strong>Status:</strong> <span className="text-yellow-600">Pending Approval</span></p>
                            </div>
                        </div>
                        <p className="text-lg font-semibold text-gray-900 mb-6">
                            Booking Reference: <span className="text-blue-600">{bookingId}</span>
                        </p>
                        <button
                            onClick={() => router.push('/')}
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-[Alata] overflow-x-hidden">
            <div className="tab-content active" id="booking">
                <div className="max-w-[1200px] mx-auto px-5 py-12">
                    <div className="intro-container mb-12">
                        <div className="intro js-animate-on-scroll">
                            <h2 className="text-4xl font-bold text-gray-900 mb-2">{sport.display_name}</h2>
                            <p className="text-xl text-gray-600">Full court with professional hoops</p>
                        </div>
                    </div>

                    <div className="sports-grid js-animate-on-scroll mb-16">
                        <div className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-2xl group">
                            {courtImages.map((img, idx) => (
                                <div
                                    key={idx}
                                    className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                                        }`}
                                >
                                    <Image
                                        src={img}
                                        alt={`${sport.display_name} photo ${idx + 1}`}
                                        fill
                                        className="object-cover"
                                        priority={idx === 0}
                                    />
                                    <div className="absolute inset-0 bg-black/10 z-20" />
                                </div>
                            ))}

                            {courtImages.length > 1 && (
                                <>
                                    <button
                                        onClick={prevSlide}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-4 rounded-full bg-white/20 hover:bg-white/40 text-white transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        &#10094;
                                    </button>
                                    <button
                                        onClick={nextSlide}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-4 rounded-full bg-white/20 hover:bg-white/40 text-white transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        &#10095;
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        {/* Booking Form */}
                        <div className="booking-form js-animate-on-scroll slide-left bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                            <div className="prompts mb-8">
                                <h3 className="text-2xl font-bold text-gray-900">Reservation Details</h3>
                            </div>

                            <form className="space-y-6">
                                <div className="form-group">
                                    <label className="block text-gray-700 font-bold mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        name="customer_name"
                                        value={formData.customer_name}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border text-black border-gray-300 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter your full name"
                                    />
                                    {errors.customer_name && <p className="text-red-600 text-sm mt-1">{errors.customer_name}</p>}
                                </div>

                                <div className="form-group">
                                    <label className="block text-gray-800 font-bold mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                          className="w-full px-4 py-3 border text-black border-gray-300 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter your email"
                                    />
                                    <small className="text-gray-500 block mt-1">Only Gmail, Yahoo, Outlook, and other major providers accepted</small>
                                    {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                                </div>

                                <div className="form-group">
                                    <label className="block text-gray-700 font-bold mb-2">Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        maxLength={11}
                                          className="w-full px-4 py-3 border text-black border-gray-300 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter your 11-digit phone number"
                                    />
                                    <small className="text-gray-500 block mt-1">Must be exactly 11 digits</small>
                                    {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
                                </div>

                                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                                    By submitting your registration, your personal data will be processed in line with {DATA_PRIVACY_REFERENCE}. Full details are in our{' '}
                                    <a href="/privacy" target="_blank" className="font-bold underline">Privacy Policy</a>.
                                </div>

                                <div className="form-group">
                                    <label className="block text-gray-700 font-bold mb-2">Number of People</label>
                                    <input
                                        type="number"
                                        name="people_count"
                                        value={formData.people_count}
                                        onChange={handleInputChange}
                                        min={1}
                                        max={15}
                                          className="w-full px-4 py-3 border text-gray-600 border-gray-100 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="How many people? (Max 15)"
                                    />
                                    {errors.people_count && <p className="text-red-600 text-sm mt-1">{errors.people_count}</p>}
                                </div>

                                <div className="form-group">
                                    <label className="block text-gray-700 font-bold mb-4">Preferred Time</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Start Time:</label>
                                            <input
                                                type="time"
                                                name="start_time"
                                                value={formData.start_time}
                                                onChange={handleInputChange}
                                                 className="w-full px-4 py-3 border text-black border-gray-300 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">End Time:</label>
                                            <input
                                                type="time"
                                                name="end_time"
                                                value={formData.end_time}
                                                onChange={handleInputChange}
                                                 className="w-full px-4 py-3 border text-black border-gray-300 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                    <small className="text-gray-500 block mt-2">Operating hours: 8:00 AM - 10:00 PM. Maximum 4 hours per booking.</small>
                                    {errors.time && <p className="text-red-600 text-sm mt-1">{errors.time}</p>}
                                </div>

                                {(normalizeSportKey(sport.name) === 'basketball' || normalizeSportKey(sport.name) === 'badminton') && (
                                    <div className="form-group">
                                        <label className="block text-gray-700 font-bold mb-2">Select Rental Option:</label>
                                        <select
                                            name="rental_option"
                                            value={formData.rental_option}
                                            onChange={handleInputChange}
                                             className="w-full px-4 py-3 border text-black border-gray-300 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="" disabled>Choose a configuration</option>
                                            {RENTAL_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                        {errors.rental_option && <p className="text-red-600 text-sm mt-1">{errors.rental_option}</p>}
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Right Selection Content */}
                        <div className="space-y-12">
                            <div className="date-selection js-animate-on-scroll slide-right bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                                <div className="prompts mb-6">
                                    <h3 className="text-2xl font-bold text-gray-900">Select Date</h3>
                                    <p className="text-gray-600">You can only book for today and the next two days</p>
                                </div>

                                <div className="space-y-4">
                                    {availableDates.map(date => (
                                        <button
                                            key={date}
                                            onClick={() => setSelectedDate(date)}
                                            className={`w-full p-5 rounded-xl border-2 text-left transition-all duration-300 ${selectedDate === date
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-gray-200 hover:border-blue-300'
                                                }`}
                                        >
                                            <p className="font-bold text-gray-900">{formatDateLong(date)}</p>
                                        </button>
                                    ))}
                                </div>
                                {errors.date && <p className="text-red-600 text-sm mt-4">{errors.date}</p>}
                            </div>

                            <div className="payment-section js-animate-on-scroll slide-right bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">Payment Method</h3>
                                <p className="text-gray-600 mb-8">Payment will be collected in cash upon arrival at the facility</p>

                                <div className="payment-box p-8 border-2 border-dashed border-green-200 rounded-2xl text-center bg-green-50/30">
                                    <div className="mb-4">
                                        <span className="text-5xl">💵</span>
                                    </div>
                                    <p className="text-xl font-bold text-gray-900 mb-2">Cash Payment Only</p>
                                    <p className="text-4xl font-extrabold text-blue-700">
                                        {formatCurrency(calculateTotalAmount())}
                                    </p>
                                    <small className="text-gray-500 block mt-4 text-base font-medium">Please bring exact change when possible</small>
                                </div>

                                <button
                                    onClick={handleBookNow}
                                    className="w-full mt-10 bg-gradient-to-b from-[#1e3c72] to-[#8e44ad] text-white py-5 rounded-xl text-xl font-bold shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    Book Now
                                </button>

                                <p className="text-gray-700 font-medium">
                                    <span className="text-green-600 text-xl mr-2">✓</span>
                                    Final Step: Your complete summary will display below after booking.
                                </p>
                            </div>

                            {/* Unavailable Slots Section */}
                            {selectedDate && blockedSlots.filter(s => s.booking_date === selectedDate && (!s.sport_id || s.sport_id === sport.id)).length > 0 && (
                                <div className="mt-8 p-6 bg-red-50 rounded-xl border border-red-100">
                                    <h4 className="text-red-800 font-bold mb-3 flex items-center">
                                        <span className="mr-2">🕒</span> Unavailable Times for {formatDateLong(selectedDate)}:
                                    </h4>
                                    <div className="space-y-2">
                                        {blockedSlots
                                            .filter(s => s.booking_date === selectedDate && (!s.sport_id || s.sport_id === sport.id))
                                            .map((slot, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-red-700 text-sm bg-white p-2 rounded border border-red-50 shadow-sm">
                                                    <span className="font-medium">{slot.name}</span>
                                                    <span className="font-bold">{formatTimeToAMPM(slot.start_time)} - {formatTimeToAMPM(slot.end_time)}</span>
                                                </div>
                                            ))}
                                    </div>
                                    <p className="text-xs text-red-600 mt-3 italic">* This court is reserved for maintenance or specific events during these times.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Confirmation Modal */}
                {showConfirmation && sport && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4 overflow-y-auto">
                        <div className="bg-white rounded-[20px] p-8 max-w-xl w-full shadow-2xl my-8">
                            <h3 className="text-3xl font-bold text-gray-900 mb-2">Confirm Your Booking</h3>
                            <p className="text-gray-600 mb-8 text-lg">Please review your booking details:</p>

                            <div className="bg-gray-50 p-6 rounded-xl space-y-4 mb-8 text-gray-800 text-lg shadow-inner">
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="font-bold">Sport:</span>
                                    <span>{sport.display_name}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="font-bold">Date:</span>
                                    <span>{formatDateLong(selectedDate)}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="font-bold">Time:</span>
                                    <span>{formatTimeToAMPM(formData.start_time)} to {formatTimeToAMPM(formData.end_time)}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="font-bold">Name:</span>
                                    <span>{formData.customer_name}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="font-bold">Email:</span>
                                    <span>{formData.email}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="font-bold">Phone:</span>
                                    <span>{formData.phone}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 pb-2 text-blue-700">
                                    <span className="font-bold">Total Amount:</span>
                                    <span className="font-black">{formatCurrency(calculateTotalAmount())}</span>
                                </div>
                            </div>

                            <div className="space-y-4 mb-10">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={termsAccepted}
                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                        className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                                    />
                                    <span className="text-gray-700 text-base leading-tight group-hover:text-gray-900 transition-colors">
                                        I agree to the <a href="/terms-conditions" target="_blank" className="text-blue-600 hover:underline font-bold">Terms and Conditions</a>
                                    </span>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={privacyAccepted}
                                        onChange={(e) => setPrivacyAccepted(e.target.checked)}
                                        className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                                    />
                                    <span className="text-gray-700 text-base leading-tight group-hover:text-gray-900 transition-colors">
                                        I consent to the collection and processing of my personal data in accordance with <strong>{DATA_PRIVACY_REFERENCE}</strong> and the <a href="/privacy" target="_blank" className="text-blue-600 hover:underline font-bold">Privacy Policy</a>
                                    </span>
                                </label>
                                {errors.agreements && <p className="text-red-600 text-sm font-bold bg-red-50 p-2 rounded">{errors.agreements}</p>}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowConfirmation(false)}
                                    disabled={submitting}
                                    className="flex-1 bg-gray-200 text-gray-800 py-4 rounded-xl font-bold hover:bg-gray-300 transition-all disabled:opacity-50 text-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (!termsAccepted || !privacyAccepted) {
                                            setErrors(prev => ({ ...prev, agreements: 'Please accept both terms and privacy policy to proceed.' }));
                                            return;
                                        }
                                        handleConfirmBooking();
                                    }}
                                    disabled={submitting}
                                    className="flex-1 bg-green-600 text-white py-4 rounded-xl font-bold shadow-xl hover:bg-green-700 transition-all disabled:opacity-50 text-lg"
                                >
                                    {submitting ? 'Processing...' : 'Confirm Booking'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
