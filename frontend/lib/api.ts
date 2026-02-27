// API Client for GreatLife Booking System
import type {
    Sport,
    Booking,
    CreateBookingData,
    UpdateBookingData,
    AdminStats,
    MonthlyReport,
    ApiResponse,
    LoginResponse,
    BlockedSlot
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options?: RequestInit
    ): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || 'An error occurred',
                };
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error',
            };
        }
    }

    // Sports endpoints 
    async getSports(): Promise<ApiResponse<Sport[]>> {
        return this.request<Sport[]>('/sports');
    }

    async getSport(id: number): Promise<ApiResponse<Sport>> {
        return this.request<Sport>(`/sports/${id}`);
    }

    // Bookings endpoints
    async getBookings(filters?: {
        sport?: number;
        status?: string;
        date?: string;
        search?: string;
    }): Promise<ApiResponse<Booking[]>> {
        const params = new URLSearchParams();
        if (filters?.sport) params.append('sport', filters.sport.toString());
        if (filters?.status) params.append('status', filters.status);
        if (filters?.date) params.append('date', filters.date);
        if (filters?.search) params.append('search', filters.search);

        const query = params.toString();
        return this.request<Booking[]>(`/bookings${query ? `?${query}` : ''}`);
    }

    async getBooking(id: number): Promise<ApiResponse<Booking>> {
        return this.request<Booking>(`/bookings/${id}`);
    }

    async createBooking(data: CreateBookingData): Promise<ApiResponse<Booking>> {
        return this.request<Booking>('/bookings', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateBooking(
        id: number,
        data: UpdateBookingData
    ): Promise<ApiResponse<Booking>> {
        return this.request<Booking>(`/bookings/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async approveBooking(
        id: number,
        approvedBy: string
    ): Promise<ApiResponse<Booking>> {
        return this.request<Booking>(`/bookings/${id}/approve`, {
            method: 'PUT',
            body: JSON.stringify({ approved_by: approvedBy }),
        });
    }

    async rejectBooking(
        id: number,
        rejectedBy: string,
        reason?: string
    ): Promise<ApiResponse<Booking>> {
        return this.request<Booking>(`/bookings/${id}/reject`, {
            method: 'PUT',
            body: JSON.stringify({
                rejected_by: rejectedBy,
                rejection_reason: reason,
            }),
        });
    }

    async cancelBooking(
        id: number,
        cancelledBy: string
    ): Promise<ApiResponse<Booking>> {
        return this.request<Booking>(`/bookings/${id}/cancel`, {
            method: 'PUT',
            body: JSON.stringify({ cancelled_by: cancelledBy }),
        });
    }

    async deleteBooking(id: number): Promise<ApiResponse<void>> {
        return this.request<void>(`/bookings/${id}`, {
            method: 'DELETE',
        });
    }

    // Admin endpoints
    async login(
        username: string,
        password: string
    ): Promise<ApiResponse<LoginResponse>> {
        return this.request<LoginResponse>('/admin/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
    }

    async getStats(): Promise<ApiResponse<AdminStats>> {
        return this.request<AdminStats>('/admin/stats');
    }

    async getMonthlyReport(
        month: string,
        year: string
    ): Promise<ApiResponse<MonthlyReport>> {
        return this.request<MonthlyReport>(
            `/admin/reports?month=${month}&year=${year}`
        );
    }

    // Blocked Slots endpoints
    async getBlockedSlots(): Promise<ApiResponse<BlockedSlot[]>> {
        return this.request<BlockedSlot[]>('/blocked-slots');
    }

    async createBlockedSlot(data: {
        sport_id?: number | null;
        name: string;
        booking_date: string;
        start_time: string;
        end_time: string;
    }): Promise<ApiResponse<BlockedSlot>> {
        return this.request<BlockedSlot>('/blocked-slots', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async deleteBlockedSlot(id: number): Promise<ApiResponse<void>> {
        return this.request<void>(`/blocked-slots/${id}`, {
            method: 'DELETE',
        });
    }
}

export const api = new ApiClient(API_URL);
