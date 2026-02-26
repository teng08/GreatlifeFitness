// TypeScript type definitions for the GreatLife Booking System

export interface Sport {
    id: number;
    name: string;
    display_name: string;
    description?: string;
    price: number;
    max_people: number;
    created_at: string;
}

export interface Booking {
    id: number;
    sport_id: number;
    customer_name: string;
    email: string;
    phone: string;
    people_count: number;
    booking_date: string;
    start_time: string;
    end_time: string;
    payment_method: string;
    amount: number;
    status: 'pending' | 'confirmed' | 'cancelled';
    payment_status: 'pending' | 'paid';
    payment_id?: string;
    rental_option: string;
    approved_by?: string;
    approved_at?: string;
    rejected_by?: string;
    rejected_at?: string;
    rejection_reason?: string;
    cancelled_by?: string;
    cancelled_at?: string;
    created_at: string;
    updated_at: string;
    sports?: Sport;
}

export interface CreateBookingData {
    sport_id: number;
    customer_name: string;
    email: string;
    phone: string;
    people_count: number;
    booking_date: string;
    start_time: string;
    end_time: string;
    amount: number;
    rental_option: string;
}

export interface UpdateBookingData {
    customer_name?: string;
    email?: string;
    phone?: string;
    people_count?: number;
    booking_date?: string;
    start_time?: string;
    end_time?: string;
}

export interface AdminStats {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    bySport: Record<string, number>;
}

export interface MonthlyReport {
    month: string;
    year: string;
    totalBookings: number;
    totalRevenue: number;
    confirmedBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    bookings: Booking[];
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface User {
    id: number;
    username: string;
    full_name: string;
    role: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}

export interface BlockedSlot {
    id: number;
    sport_id: number | null;
    name: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    created_at: string;
    sports?: Sport;
}
