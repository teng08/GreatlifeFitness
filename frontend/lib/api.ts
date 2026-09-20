// API Client for GreatLife Booking System
import type {
    Sport,
    Booking,
    CreateBookingData,
    UpdateBookingData,
    AdminStats,
    MonthlyReport,
    BookingHistoryEntry,
    ApiResponse,
    LoginResponse,
    BlockedSlot
} from './types';

const normalizeBaseUrl = (value?: string) => {
    const trimmed = value?.trim();
    if (!trimmed) return '/api';
    return trimmed.replace(/\/+$/, '');
};

const API_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);

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
            const token = typeof window !== 'undefined'
                ? window.localStorage.getItem('adminToken')
                : null;
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...options?.headers,
                },
            });

            const rawBody = await response.text();
            let payload: ApiResponse<T> | null = null;

            if (rawBody) {
                try {
                    payload = JSON.parse(rawBody) as ApiResponse<T>;
                } catch {
                    payload = null;
                }
            }

            if (!response.ok) {
                if (response.status === 401 && typeof window !== 'undefined' && endpoint !== '/admin/login') {
                    window.localStorage.removeItem('adminToken');
                    window.localStorage.removeItem('adminUser');
                    window.location.assign('/login');
                }
                const fallbackMessage = rawBody
                    ? rawBody.replace(/\s+/g, ' ').trim().slice(0, 220)
                    : `Request failed with status ${response.status}`;
                return {
                    success: false,
                    error: payload?.error || fallbackMessage,
                };
            }

            if (!payload) {
                return {
                    success: false,
                    error: 'Invalid API response format',
                };
            }

            return payload;
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

    async getReportRange(
        startDate: string,
        endDate: string
    ): Promise<ApiResponse<MonthlyReport>> {
        const params = new URLSearchParams({ startDate, endDate });
        return this.request<MonthlyReport>(`/admin/reports?${params.toString()}`);
    }

    async getBookingHistory(id: number): Promise<ApiResponse<BookingHistoryEntry[]>> {
        return this.request<BookingHistoryEntry[]>(`/bookings/${id}/history`);
    }

    async markBookingPaid(
        id: number,
        paidBy: string,
        options?: {
            payment_method?: string;
            payment_id?: string;
        }
    ): Promise<ApiResponse<Booking>> {
        return this.request<Booking>(`/bookings/${id}/mark-paid`, {
            method: 'PUT',
            body: JSON.stringify({
                paid_by: paidBy,
                payment_method: options?.payment_method,
                payment_id: options?.payment_id,
            }),
        });
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

const apiClient = new ApiClient(API_URL);

export const api = apiClient;
export default apiClient;
