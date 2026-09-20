'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { sendBookingEmailFromBrowser, type BookingEmailStatus } from '@/lib/email';
import Image from 'next/image';
import type { Booking, AdminStats, Sport, BlockedSlot, MonthlyReport, BookingHistoryEntry } from '@/lib/types';
import { formatDate, formatTimeToAMPM, formatCurrency } from '@/lib/utils';
import { createXlsxFile, downloadXlsx, type XlsxCellInput, type XlsxSheetInput } from '@/lib/xlsx';
import styles from './dashboard.module.css';

const normalizeSportKey = (value?: string | null) =>
    (value || '').toLowerCase().trim().replace(/\s+/g, '-');

export default function AdminDashboard() {
    const router = useRouter();
    const [adminName, setAdminName] = useState('GreatLife Admin');
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [sports, setSports] = useState<Sport[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
    const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<'overview' | 'reservations' | 'blocked-slots' | 'reports'>('overview');
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [selectedBookingHistory, setSelectedBookingHistory] = useState<BookingHistoryEntry[]>([]);
    const [selectedHistoryLoading, setSelectedHistoryLoading] = useState(false);
    const [emailSendingId, setEmailSendingId] = useState<number | null>(null);
    const [deletingBookingId, setDeletingBookingId] = useState<number | null>(null);

    const [reportRange, setReportRange] = useState({ startDate: '', endDate: '' });
    const [report, setReport] = useState<MonthlyReport | null>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);

    const ensureStatusEmail = async (
        booking: Booking,
        status: BookingEmailStatus,
        backendSent?: boolean
    ) => {
        if (backendSent) return true;

        const browserDelivery = await sendBookingEmailFromBrowser(booking, status);
        if (!browserDelivery.sent) {
            console.error(`EmailJS ${status} browser fallback failed:`, browserDelivery.error);
        }
        return browserDelivery.sent;
    };

    const handleResendEmail = async (booking: Booking) => {
        const status: BookingEmailStatus = booking.status === 'pending'
            ? 'PENDING'
            : booking.status === 'confirmed'
                ? booking.payment_status === 'paid'
                    ? 'PAID'
                    : 'APPROVED'
                : booking.rejected_by || booking.rejection_reason
                    ? 'REJECTED'
                    : 'CANCELLED';

        setEmailSendingId(booking.id);
        try {
            const delivery = await sendBookingEmailFromBrowser(booking, status);
            window.alert(delivery.sent
                ? `Email sent successfully to ${booking.email}.`
                : `Email could not be sent: ${delivery.error || 'Unknown EmailJS error'}`);
        } finally {
            setEmailSendingId(null);
        }
    };

    // New Block Slot Form State
    const [newBlock, setNewBlock] = useState({
        name: '',
        booking_date: '',
        start_time: '',
        end_time: '',
        sport_id: ''
    });

    // Filters
    const [filters, setFilters] = useState({
        date: '',
        sport: '',
        status: '',
        search: ''
    });

    useEffect(() => {
        const adminToken = localStorage.getItem('adminToken');
        const adminUser = localStorage.getItem('adminUser');
        if (!adminToken || !adminUser) {
            router.push('/login'); // Redirect to login if not authenticated
            return;
        }
        try {
            const parsedUser = JSON.parse(adminUser) as { full_name?: string; username?: string };
            setAdminName(parsedUser.full_name || parsedUser.username || 'GreatLife Admin');
        } catch {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            router.push('/login');
            return;
        }
        loadData();
    }, [router]);

    useEffect(() => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const toISODate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        setReportRange({ startDate: toISODate(start), endDate: toISODate(end) });
    }, []);

    useEffect(() => {
        let filtered = [...bookings];

        if (filters.date) {
            filtered = filtered.filter(b => b.booking_date === filters.date);
        }

        if (filters.sport) {
            const selectedSport = normalizeSportKey(filters.sport);
            filtered = filtered.filter((b) => {
                const bookingSportName = normalizeSportKey(b.sports?.name);
                const bookingSportDisplay = normalizeSportKey(b.sports?.display_name);
                return bookingSportName === selectedSport || bookingSportDisplay === selectedSport;
            });
        }

        if (filters.status) {
            filtered = filtered.filter(b => b.status === filters.status);
        }

        if (filters.search) {
            const search = filters.search.toLowerCase();
            filtered = filtered.filter(b =>
                b.customer_name.toLowerCase().includes(search) ||
                b.email.toLowerCase().includes(search) ||
                b.phone.includes(search)
            );
        }

        setFilteredBookings(filtered);
    }, [bookings, filters]);

    useEffect(() => {
        const bookingId = selectedBooking?.id;
        if (!bookingId) {
            setSelectedBookingHistory([]);
            return;
        }

        let cancelled = false;

        setSelectedHistoryLoading(true);
        api.getBookingHistory(bookingId)
            .then((response) => {
                if (cancelled) return;
                if (response.success && response.data) {
                    setSelectedBookingHistory(response.data);
                } else {
                    setSelectedBookingHistory([]);
                }
            })
            .catch((error) => {
                console.error('Error loading booking history:', error);
                if (!cancelled) setSelectedBookingHistory([]);
            })
            .finally(() => {
                if (!cancelled) setSelectedHistoryLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [selectedBooking?.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsRes, bookingsRes, blockedRes, sportsRes] = await Promise.all([
                api.getStats(),
                api.getBookings(),
                api.getBlockedSlots(),
                api.getSports()
            ]);

            if (statsRes.success && statsRes.data) {
                setStats(statsRes.data);
            }

            if (bookingsRes.success && bookingsRes.data) {
                setBookings(bookingsRes.data);
            }

            if (blockedRes.success && blockedRes.data) {
                setBlockedSlots(blockedRes.data);
            }

            if (sportsRes.success && sportsRes.data) {
                setSports(sportsRes.data);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadReport = useCallback(async () => {
        if (!reportRange.startDate || !reportRange.endDate) return;
        setReportLoading(true);
        setReportError(null);
        try {
            const response = await api.getReportRange(reportRange.startDate, reportRange.endDate);
            if (response.success && response.data) {
                setReport(response.data);
            } else {
                setReport(null);
                setReportError(response.error || 'Failed to generate report');
            }
        } catch (error) {
            console.error('Error loading report:', error);
            setReport(null);
            setReportError('Failed to generate report');
        } finally {
            setReportLoading(false);
        }
    }, [reportRange.startDate, reportRange.endDate]);

    useEffect(() => {
        if (activeSection !== 'reports') return;
        if (reportLoading) return;
        if (report) return;
        if (!reportRange.startDate || !reportRange.endDate) return;
        void loadReport();
    }, [activeSection, loadReport, report, reportLoading, reportRange.endDate, reportRange.startDate]);

    const handleExportReport = () => {
        if (!report) return;

        const safeNumber = (value: unknown) => {
            const parsed = typeof value === 'number' ? value : Number(value);
            return Number.isFinite(parsed) ? parsed : 0;
        };

        const toPercentLabel = (value: number, total: number) => {
            if (!total) return '0.0%';
            return `${((value / total) * 100).toFixed(1)}%`;
        };

        const generatedAt = new Date();
        const totalRevenue = safeNumber(report.totalRevenue);
        const paidRevenue = safeNumber(report.paidRevenue);
        const confirmedRevenue = safeNumber(report.confirmedRevenue);
        const outstandingRevenue = Math.max(totalRevenue - paidRevenue, 0);

        const summaryRows: XlsxSheetInput['rows'] = [
            [{ value: 'GreatLife Fitness', style: 'title' }, null, null, null],
            [{ value: 'Monthly Business Report', style: 'subtitle' }, null, null, null],
            [{ value: `Reporting Period: ${report.startDate} to ${report.endDate} | Generated: ${generatedAt.toLocaleString()}`, style: 'muted' }, null, null, null],
            [null, null, null, null],
            [{ value: 'Executive Summary', style: 'section' }, null, null, null],
            [{ value: 'Metric', style: 'header' }, { value: 'Value', style: 'header' }, { value: 'Share / Rate', style: 'header' }, { value: 'Notes', style: 'header' }],
            [{ value: 'Total Bookings', style: 'label' }, { value: report.totalBookings, style: 'metric' }, { value: '100%', style: 'textCenter' }, { value: 'All reservations recorded for the selected range', style: 'text' }],
            [{ value: 'Confirmed Bookings', style: 'label' }, { value: report.confirmedBookings, style: 'metric' }, { value: toPercentLabel(report.confirmedBookings, report.totalBookings), style: 'textCenter' }, { value: 'Completed approvals ready for fulfillment', style: 'text' }],
            [{ value: 'Pending Bookings', style: 'label' }, { value: report.pendingBookings, style: 'metric' }, { value: toPercentLabel(report.pendingBookings, report.totalBookings), style: 'textCenter' }, { value: 'Reservations awaiting action', style: 'text' }],
            [{ value: 'Cancelled Bookings', style: 'label' }, { value: report.cancelledBookings, style: 'metric' }, { value: toPercentLabel(report.cancelledBookings, report.totalBookings), style: 'textCenter' }, { value: 'Bookings not converted to service', style: 'text' }],
            [{ value: 'Total Revenue', style: 'label' }, { value: totalRevenue, style: 'currency' }, { value: 'Gross', style: 'textCenter' }, { value: 'Revenue attached to all bookings in range', style: 'text' }],
            [{ value: 'Confirmed Revenue', style: 'label' }, { value: confirmedRevenue, style: 'currency' }, { value: toPercentLabel(confirmedRevenue, totalRevenue), style: 'textCenter' }, { value: 'Revenue tied to confirmed bookings', style: 'text' }],
            [{ value: 'Paid Revenue', style: 'label' }, { value: paidRevenue, style: 'currency' }, { value: toPercentLabel(paidRevenue, totalRevenue), style: 'textCenter' }, { value: 'Collections already received', style: 'text' }],
            [{ value: 'Outstanding Revenue', style: 'label' }, { value: outstandingRevenue, style: 'currency' }, { value: toPercentLabel(outstandingRevenue, totalRevenue), style: 'textCenter' }, { value: 'Revenue still to be collected', style: 'text' }],
            [null, null, null, null],
            [{ value: 'Bookings by Sport', style: 'section' }, null, null, null],
            [{ value: 'Sport', style: 'header' }, { value: 'Bookings', style: 'header' }, { value: 'Share', style: 'header' }, { value: 'Business Note', style: 'header' }],
            ...Object.entries(report.bookingsBySport || {}).map(([sport, count]): XlsxCellInput[] => [
                { value: sport, style: 'label' },
                { value: safeNumber(count), style: 'metric' },
                { value: toPercentLabel(safeNumber(count), report.totalBookings), style: 'textCenter' },
                { value: 'Contribution to total booking volume', style: 'text' },
            ]),
            [null, null, null, null],
            [{ value: 'Revenue by Payment Method', style: 'section' }, null, null, null],
            [{ value: 'Payment Method', style: 'header' }, { value: 'Revenue', style: 'header' }, { value: 'Share', style: 'header' }, { value: 'Collection Note', style: 'header' }],
            ...Object.entries(report.revenueByPaymentMethod || {}).map(([method, amount]): XlsxCellInput[] => {
                const normalizedAmount = safeNumber(amount);
                return [
                    { value: method, style: 'label' },
                    { value: normalizedAmount, style: 'currency' },
                    { value: toPercentLabel(normalizedAmount, paidRevenue), style: 'textCenter' },
                    { value: 'Share of collected revenue', style: 'text' },
                ];
            }),
            [null, null, null, null],
            [{ value: 'Top Customers', style: 'section' }, null, null, null],
            [{ value: 'Customer', style: 'header' }, { value: 'Bookings', style: 'header' }, { value: 'Paid Revenue', style: 'header' }, { value: 'Email', style: 'header' }],
            ...((report.topCustomers || []).slice(0, 5).map((customer): XlsxCellInput[] => [
                { value: customer.customer_name || 'Unknown', style: 'label' },
                { value: safeNumber(customer.bookings), style: 'metric' },
                { value: safeNumber(customer.paidAmount), style: 'currency' },
                { value: customer.email || '-', style: 'text' },
            ])),
        ];

        const bookingRows: XlsxSheetInput['rows'] = [
            [
                { value: 'ID', style: 'header' },
                { value: 'Customer Name', style: 'header' },
                { value: 'Email', style: 'header' },
                { value: 'Phone', style: 'header' },
                { value: 'Sport', style: 'header' },
                { value: 'Booking Date', style: 'header' },
                { value: 'Start Time', style: 'header' },
                { value: 'End Time', style: 'header' },
                { value: 'Booking Status', style: 'header' },
                { value: 'Payment Status', style: 'header' },
                { value: 'Payment Method', style: 'header' },
                { value: 'Amount', style: 'header' },
                { value: 'Reference', style: 'header' },
                { value: 'Created At', style: 'header' },
                { value: 'Approved At', style: 'header' }
            ],
            ...((report.bookings || []) as Booking[]).map((booking): XlsxCellInput[] => [
                { value: booking.id, style: 'textCenter' },
                { value: booking.customer_name, style: 'text' },
                { value: booking.email, style: 'text' },
                { value: booking.phone, style: 'text' },
                { value: booking.sports?.display_name || booking.sports?.name || '', style: 'text' },
                { value: booking.booking_date, style: 'textCenter' },
                { value: booking.start_time, style: 'textCenter' },
                { value: booking.end_time, style: 'textCenter' },
                { value: booking.status, style: 'textCenter' },
                { value: normalizePaymentStatus(booking.payment_status), style: 'textCenter' },
                { value: booking.payment_method || '', style: 'text' },
                { value: safeNumber(booking.amount), style: 'currency' },
                { value: booking.payment_id || '', style: 'text' },
                { value: booking.created_at, style: 'text' },
                { value: booking.approved_at || '', style: 'text' }
            ])
        ];

        const xlsxBytes = createXlsxFile([
            {
                name: 'Business Summary',
                rows: summaryRows,
                columns: [24, 18, 18, 42],
                merges: ['A1:D1', 'A2:D2', 'A3:D3', 'A5:D5', 'A16:D16', 'A22:D22', 'A28:D28'],
            },
            {
                name: 'Booking Register',
                rows: bookingRows,
                columns: [8, 24, 28, 18, 18, 14, 12, 12, 16, 16, 18, 14, 22, 22, 22],
                freeze: { row: 1 },
            },
        ]);

        const filename = `monthly-business-report_${report.startDate}_to_${report.endDate}.xlsx`;
        downloadXlsx(filename, xlsxBytes);
    };

    const handleCreateBlock = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.createBlockedSlot({
                ...newBlock,
                sport_id: newBlock.sport_id ? parseInt(newBlock.sport_id) : null
            });

            if (response.success) {
                alert('Time slot blocked successfully!');
                setNewBlock({
                    name: '',
                    booking_date: '',
                    start_time: '',
                    end_time: '',
                    sport_id: ''
                });
                loadData();
            } else {
                alert(response.error || 'Failed to block time slot');
            }
        } catch (error) {
            console.error('Error creating block:', error);
            alert('An error occurred while creating the block');
        }
    };

    const handleDeleteBlock = async (id: number) => {
        console.log('Attempting to delete blocked slot with ID:', id);
        if (!window.confirm('Are you sure you want to remove this block?')) return;

        try {
            const response = await api.deleteBlockedSlot(id);
            console.log('Delete response:', response);
            if (response.success) {
                window.alert('Block removed successfully!');
                loadData();
            } else {
                window.alert(response.error || 'Failed to remove block');
            }
        } catch (error) {
            console.error('Error deleting block:', error);
            window.alert('An error occurred while deleting the block');
        }
    };

    const handleApprove = async (id: number) => {
        console.log('Approve action triggered for ID:', id);
        if (!confirm('Are you sure you want to approve this booking?')) {
            console.log('Approve cancelled by user');
            return;
        }

        try {
            console.log('Calling api.approveBooking...');
            const response = await api.approveBooking(id, adminName);
            console.log('Approve response:', response);
            if (response.success && response.data) {
                const approvalEmailSent = await ensureStatusEmail(
                    response.data,
                    'APPROVED',
                    response.emailDelivery?.sent
                );

                alert(approvalEmailSent
                    ? 'Booking approved and approval email sent successfully!'
                    : 'Booking approved, but the approval email could not be sent.');
                setSelectedBooking(null);
                loadData();
            } else {
                alert(response.error || 'Failed to approve booking');
            }
        } catch (err) {
            console.error('Error in handleApprove:', err);
            alert('An unexpected error occurred. Check console for details.');
        }
    };

    const handleReject = async (id: number) => {
        console.log('Reject action triggered for ID:', id);
        const reason = prompt('Enter rejection reason:');
        if (reason === null) {
            console.log('Reject cancelled by user');
            return;
        }

        try {
            console.log('Calling api.rejectBooking...');
            const response = await api.rejectBooking(id, adminName, reason || 'No reason provided');
            console.log('Reject response:', response);
            if (response.success && response.data) {
                const rejectionEmailSent = await ensureStatusEmail(
                    response.data,
                    'REJECTED',
                    response.emailDelivery?.sent
                );
                alert(rejectionEmailSent
                    ? 'Booking rejected and customer notified by email.'
                    : 'Booking rejected, but the customer email could not be delivered.');
                setSelectedBooking(null);
                loadData();
            } else {
                alert(response.error || 'Failed to reject booking');
            }
        } catch (err) {
            console.error('Error in handleReject:', err);
            alert('An unexpected error occurred. Check console for details.');
        }
    };

    const handleCancel = async (id: number) => {
        if (!confirm('Are you sure you want to cancel this booking?')) {
            return;
        }

        try {
            const response = await api.cancelBooking(id, adminName);
            if (response.success && response.data) {
                const cancellationEmailSent = await ensureStatusEmail(
                    response.data,
                    'CANCELLED',
                    response.emailDelivery?.sent
                );
                alert(cancellationEmailSent
                    ? 'Booking cancelled and customer notified by email.'
                    : 'Booking cancelled, but the customer email could not be delivered.');
                setSelectedBooking(null);
                loadData();
            } else {
                alert(response.error || 'Failed to cancel booking');
            }
        } catch (error) {
            console.error('Error cancelling booking:', error);
            alert('An unexpected error occurred. Check console for details.');
        }
    };

    const handleDeleteBooking = async (booking: Booking) => {
        const confirmed = window.confirm(
            `Permanently delete booking #${booking.id} for ${booking.customer_name}?\n\nThis also removes its history and cannot be undone.`
        );
        if (!confirmed) return;

        setDeletingBookingId(booking.id);
        try {
            const response = await api.deleteBooking(booking.id);
            if (response.success) {
                setSelectedBooking(null);
                alert(`Booking #${booking.id} was deleted successfully.`);
                await loadData();
            } else {
                alert(response.error || 'Failed to delete booking');
            }
        } catch (error) {
            console.error('Error deleting booking:', error);
            alert('An unexpected error occurred while deleting the booking.');
        } finally {
            setDeletingBookingId(null);
        }
    };

    const handleMarkPaid = async (id: number) => {
        if (!confirm('Mark this booking as PAID?')) {
            return;
        }

        const receipt = prompt('Receipt / Reference (optional):', selectedBooking?.payment_id || '');
        if (receipt === null) return;

        try {
            const response = await api.markBookingPaid(id, adminName, {
                payment_id: receipt.trim() ? receipt.trim() : undefined,
            });
            if (response.success && response.data) {
                const paymentEmailSent = await ensureStatusEmail(
                    response.data,
                    'PAID',
                    response.emailDelivery?.sent
                );
                alert(paymentEmailSent
                    ? 'Payment marked as paid and customer notified by email.'
                    : 'Payment marked as paid, but the customer email could not be delivered.');
                setSelectedBooking(null);
                loadData();
            } else {
                alert(response.error || 'Failed to mark as paid');
            }
        } catch (error) {
            console.error('Error marking booking as paid:', error);
            alert('An unexpected error occurred. Check console for details.');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        router.push('/login');
    };

    const formatDateTime = (value?: string) => {
        if (!value) return 'N/A';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString();
    };

    const normalizePaymentStatus = (value?: Booking['payment_status'] | null) => {
        if (value === 'paid') return 'paid';
        if (value === 'refunded') return 'refunded';
        return 'unpaid';
    };

    const getPaymentStatusBadge = (value?: Booking['payment_status'] | null) => {
        const normalized = normalizePaymentStatus(value);
        return {
            label: normalized.toUpperCase(),
            className: normalized === 'paid' ? styles.statusPaid : normalized === 'refunded' ? styles.statusRefunded : styles.statusUnpaid
        };
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f9f9f9]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#130CB2] mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.dashboardWrapper} ${styles.bgWhite}`}>
            <div className={styles.container}>
                <header className={styles.header}>
                    <div>
                        <p>GreatLife Fitness</p>
                        <h1>Operations dashboard</h1>
                        <span>Reservations, schedules, payments, and reporting in one place.</span>
                    </div>
                    <div>
                        <strong>{stats?.pending || 0}</strong>
                        <span>awaiting review</span>
                    </div>
                </header>

                <div className={styles.dashboard}>
                    {/* Sidebar */}
                    <div className={styles.sidebar}>
                        <div className={styles.logo}>
                            <Image src="/images/logo.png" alt="" width={42} height={42} />
                            <div><h2>GreatLife</h2><span>Staff workspace</span></div>
                        </div>

                        <ul className={styles.menu}>
                            <li>
                                <button
                                    className={`${styles.menuItem} ${activeSection === 'overview' ? styles.menuItemActive : ''}`}
                                    onClick={() => setActiveSection('overview')}
                                >
                                    <i className="fas fa-home"></i> Dashboard
                                </button>
                            </li>
                            <li>
                                <button
                                    className={`${styles.menuItem} ${activeSection === 'reservations' ? styles.menuItemActive : ''}`}
                                    onClick={() => setActiveSection('reservations')}
                                >
                                    <i className="fas fa-calendar-alt"></i> Reservations
                                </button>
                            </li>
                            <li>
                                <button
                                    className={`${styles.menuItem} ${activeSection === 'blocked-slots' ? styles.menuItemActive : ''}`}
                                    onClick={() => setActiveSection('blocked-slots')}
                                >
                                    <i className="fas fa-ban"></i> Blocked Slots
                                </button>
                            </li>
                            <li>
                                <button
                                    className={`${styles.menuItem} ${activeSection === 'reports' ? styles.menuItemActive : ''}`}
                                    onClick={() => setActiveSection('reports')}
                                >
                                    <i className="fas fa-chart-line"></i> Reports
                                </button>
                            </li>
                            <li>
                                <button
                                    className={styles.menuItem}
                                    onClick={handleLogout}
                                    style={{ color: '#e74c3c' }}
                                >
                                    <i className="fas fa-sign-out-alt"></i> Logout
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* Main Content */}
                    <div className={styles.dashboardContent}>
                        <div className={styles.dashboardHeader}>
                            <div>
                            <p style={{ margin: 0, color: '#8b90a4', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Workspace</p>
                            <h2 style={{ margin: '0.25rem 0 0', color: '#11162f' }}>
                                {activeSection === 'overview' ? 'Reservation Dashboard' :
                                    activeSection === 'reservations' ? 'Manage Reservations' :
                                        activeSection === 'blocked-slots' ? 'Manage Blocked Slots' : 'Monthly Reports'}
                            </h2>
                            </div>
                            <div className={styles.userInfo}>
                                    <Image
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=6d4ab1&color=fff`}
                                    alt="User"
                                    width={40}
                                    height={40}
                                    style={{ borderRadius: '50%' }}
                                />
                                <div>
                                    <h4>{adminName}</h4>
                                    <p>Admin</p>
                                </div>
                            </div>
                        </div>

                        {/* Overview Section */}
                        {activeSection === 'overview' && (
                            <div className="animate-fade-in">
                                <div className={styles.dashboardCards}>
                                    <div className={styles.statCard}>
                                        <div className={`${styles.statIcon} ${styles.basketballBg}`}>
                                            <i className="fas fa-basketball-ball"></i>
                                        </div>
                                        <div className={styles.statInfo}>
                                            <h3>{stats?.bySport?.basketball || 0}</h3>
                                            <p>Basketball Reservations</p>
                                        </div>
                                    </div>
                                   
                                    <div className={styles.statCard}>
                                        <div className={`${styles.statIcon} ${styles.tableTennisBg}`}>
                                            <i className="fas fa-table-tennis"></i>
                                        </div>
                                        <div className={styles.statInfo}>
                                            <h3>{stats?.bySport?.['table-tennis'] || 0}</h3>
                                            <p>Table Tennis Reservations</p>
                                        </div>
                                    </div>
                                    <div className={styles.statCard}>
                                        <div className={`${styles.statIcon} ${styles.badmintonBg}`}>
                                            <i className="fas fa-shuttlecock"></i>
                                        </div>
                                        <div className={styles.statInfo}>
                                            <h3>{stats?.bySport?.badminton || 0}</h3>
                                            <p>Badminton Reservations</p>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.overviewGrid}>
                                    <div className={styles.overviewHeading}>
                                        <h3>Recent Bookings</h3>
                                        <div>
                                            {bookings.slice(0, 5).map(booking => (
                                                <div key={booking.id} className={styles.listItem}>
                                                    <div>
                                                        <strong>{booking.customer_name}</strong><br />
                                                        <small>{booking.sports?.display_name} - {formatDate(booking.booking_date)}</small>
                                                    </div>
                                                    <span className={`${styles.status} ${booking.status === 'confirmed' ? styles.statusConfirmed :
                                                        booking.status === 'pending' ? styles.statusPending : styles.statusCancelled
                                                        }`}>
                                                        {booking.status}
                                                    </span>
                                                </div>
                                            ))}
                                            {bookings.length === 0 && <p style={{ color: '#999', fontStyle: 'italic' }}>No recent bookings.</p>}
                                        </div>
                                    </div>

                                    <div className={styles.overviewHeading}>
                                        <h3>Pending Approvals</h3>
                                        <div>
                                            {bookings.filter(b => b.status === 'pending').slice(0, 5).map(booking => (
                                                <div key={booking.id} className={styles.listItem}>
                                                    <div>
                                                        <strong>{booking.customer_name}</strong><br />
                                                        <small>{booking.sports?.display_name} - {formatDate(booking.booking_date)}</small><br />
                                                        <small>{formatTimeToAMPM(booking.start_time)}</small>
                                                    </div>
                                                    <div style={{ display: 'flex' }}>
                                                        <button
                                                            onClick={() => handleApprove(booking.id)}
                                                            className={`${styles.actionButton} ${styles.approveBtn}`}
                                                            title="Approve"
                                                        >
                                                            <i className="fas fa-check"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(booking.id)}
                                                            className={`${styles.actionButton} ${styles.rejectBtn}`}
                                                            title="Reject"
                                                        >
                                                            <i className="fas fa-times"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {bookings.filter(b => b.status === 'pending').length === 0 && (
                                                <p style={{ color: '#999', fontStyle: 'italic' }}>No pending approvals.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Reservations Section */}
                        {activeSection === 'reservations' && (
                            <div className="animate-fade-in">
                                <div className={styles.filters}>
                                    <div className={styles.filterGroup}>
                                        <i className="fas fa-calendar" style={{ color: '#130CB2' }}></i>
                                        <input
                                            type="date"
                                            value={filters.date}
                                            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.filterGroup}>
                                        <i className="fas fa-filter" style={{ color: '#130CB2' }}></i>
                                        <select
                                            value={filters.sport}
                                            onChange={(e) => setFilters({ ...filters, sport: e.target.value })}
                                        >
                                            <option value="">All Sports</option>
                                            <option value="Basketball">Basketball</option>
                                            <option value="Table Tennis">Table Tennis</option>
                                            <option value="Badminton">Badminton</option>
                                            
                                        </select>
                                    </div>
                                    <div className={styles.filterGroup}>
                                        <i className="fas fa-info-circle" style={{ color: '#130CB2' }}></i>
                                        <select
                                            value={filters.status}
                                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                        >
                                            <option value="">All Statuses</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="pending">Pending</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                    <div className={styles.filterGroup}>
                                        <i className="fas fa-search" style={{ color: '#130CB2' }}></i>
                                        <input
                                            type="text"
                                            placeholder="Search customer..."
                                            value={filters.search}
                                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className={styles.tableContainer}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Customer</th>
                                                <th>Sport</th>
                                                <th>Date & Time</th>
                                                <th>Status</th>
                                                <th>Payment</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredBookings.map(booking => (
                                                (() => {
                                                    const paymentBadge = getPaymentStatusBadge(booking.payment_status);
                                                    return (
                                                <tr key={booking.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 'bold', color: '#08054C' }}>{booking.customer_name}</div>
                                                        <div style={{ fontSize: '0.8rem' }}>{booking.email}</div>
                                                        <div style={{ fontSize: '0.8rem' }}>{booking.phone}</div>
                                                    </td>
                                                    <td>{booking.sports?.display_name}</td>
                                                    <td>
                                                        <div>{formatDate(booking.booking_date)}</div>
                                                        <div style={{ fontSize: '0.8rem' }}>{formatTimeToAMPM(booking.start_time)} - {formatTimeToAMPM(booking.end_time)}</div>
                                                    </td>
                                                    <td>
                                                        <span className={`${styles.status} ${booking.status === 'confirmed' ? styles.statusConfirmed :
                                                            booking.status === 'pending' ? styles.statusPending : styles.statusCancelled
                                                            }`}>
                                                            {booking.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`${styles.status} ${paymentBadge.className}`}>
                                                            {paymentBadge.label}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            className={`${styles.actionButton} ${styles.viewBtn}`}
                                                            title="View Details"
                                                            onClick={() => setSelectedBooking(booking)}
                                                        >
                                                            <i className="fas fa-eye"></i>
                                                        </button>
                                                        {booking.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    className={`${styles.actionButton} ${styles.approveBtn}`}
                                                                    title="Approve"
                                                                    onClick={() => handleApprove(booking.id)}
                                                                >
                                                                    <i className="fas fa-check"></i>
                                                                </button>
                                                                <button
                                                                    className={`${styles.actionButton} ${styles.rejectBtn}`}
                                                                    title="Reject"
                                                                    onClick={() => handleReject(booking.id)}
                                                                >
                                                                    <i className="fas fa-times"></i>
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            className={`${styles.actionButton} ${styles.deleteBtn}`}
                                                            title="Permanently delete booking"
                                                            aria-label={`Delete booking #${booking.id}`}
                                                            disabled={deletingBookingId === booking.id}
                                                            onClick={() => void handleDeleteBooking(booking)}
                                                        >
                                                            <i className={deletingBookingId === booking.id ? 'fas fa-spinner fa-spin' : 'fas fa-trash'}></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                                    );
                                                })()
                                            ))}
                                            {filteredBookings.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No bookings found matching filters.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeSection === 'reports' && (
                            <div className="animate-fade-in">
                                <div className={styles.overviewHeading} style={{ marginBottom: '1.5rem' }}>
                                    <h3>Monthly Business Reports</h3>
                                    <p style={{ margin: 0, color: '#666' }}>
                                        Structured monthly reporting for operations, revenue tracking, and executive review.
                                    </p>
                                </div>

                                <div className={styles.filters} style={{ justifyContent: 'flex-start' }}>
                                    <div className={styles.filterGroup}>
                                        <i className="fas fa-calendar-day" style={{ color: '#130CB2' }}></i>
                                        <input
                                            type="date"
                                            value={reportRange.startDate}
                                            onChange={(e) => {
                                                setReportRange((prev) => ({ ...prev, startDate: e.target.value }));
                                                setReport(null);
                                            }}
                                        />
                                    </div>
                                    <div className={styles.filterGroup}>
                                        <i className="fas fa-calendar-check" style={{ color: '#130CB2' }}></i>
                                        <input
                                            type="date"
                                            value={reportRange.endDate}
                                            onChange={(e) => {
                                                setReportRange((prev) => ({ ...prev, endDate: e.target.value }));
                                                setReport(null);
                                            }}
                                        />
                                    </div>

                                    <button
                                        onClick={() => void loadReport()}
                                        className={`${styles.actionButton} ${styles.viewBtn}`}
                                        style={{ padding: '0.7rem 1.2rem', borderRadius: '20px', marginLeft: 0 }}
                                        disabled={reportLoading || !reportRange.startDate || !reportRange.endDate}
                                        title="Generate report"
                                    >
                                        {reportLoading ? 'Generating…' : 'Generate'}
                                    </button>
                                    <button
                                        onClick={handleExportReport}
                                        className={`${styles.actionButton} ${styles.paidBtn}`}
                                        style={{ padding: '0.7rem 1.2rem', borderRadius: '20px', marginLeft: 0, opacity: report ? 1 : 0.5 }}
                                        disabled={!report}
                                        title="Export to Excel (.xlsx)"
                                    >
                                        Export Business Report
                                    </button>
                                </div>

                                {reportError && (
                                    <div style={{ marginBottom: '1.5rem', background: '#fff', border: '1px solid #ffd5d5', borderLeft: '4px solid #e74c3c', padding: '1rem', borderRadius: '10px', color: '#a5281b' }}>
                                        {reportError}
                                    </div>
                                )}

                                {report && (
                                    <>
                                        <div className={styles.overviewHeading} style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(19, 12, 178, 0.06), rgba(52, 152, 219, 0.08))', border: '1px solid rgba(19, 12, 178, 0.12)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                <div>
                                                    <h3 style={{ marginBottom: '0.35rem' }}>Executive Reporting Snapshot</h3>
                                                    <p style={{ margin: 0, color: '#5b6475' }}>Period covered: {formatDate(report.startDate)} to {formatDate(report.endDate)}</p>
                                                </div>
                                                <div style={{ textAlign: 'right', color: '#5b6475', fontSize: '0.9rem' }}>
                                                    <div style={{ fontWeight: 700, color: '#08054C' }}>Business-ready Excel export</div>
                                                    <div>Formatted summary + booking register</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.dashboardCards}>
                                            <div className={styles.statCard}>
                                                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #3498db, #130CB2)' }}>
                                                    <i className="fas fa-calendar-alt"></i>
                                                </div>
                                                <div className={styles.statInfo}>
                                                    <h3>{report.totalBookings}</h3>
                                                    <p>Total Bookings</p>
                                                </div>
                                            </div>

                                            <div className={styles.statCard}>
                                                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #f39c12, #d35400)' }}>
                                                    <i className="fas fa-tasks"></i>
                                                </div>
                                                <div className={styles.statInfo}>
                                                    <h3 style={{ fontSize: '1.35rem' }}>
                                                        {report.confirmedBookings} / {report.pendingBookings} / {report.cancelledBookings}
                                                    </h3>
                                                    <p>Confirmed / Pending / Cancelled</p>
                                                </div>
                                            </div>

                                            <div className={styles.statCard}>
                                                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #8e44ad, #2c3e50)' }}>
                                                    <i className="fas fa-coins"></i>
                                                </div>
                                                <div className={styles.statInfo}>
                                                    <h3 style={{ fontSize: '1.35rem' }}>
                                                        {formatCurrency(report.totalRevenue)}
                                                    </h3>
                                                    <p>Total Revenue (All)</p>
                                                    <p style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#7f8c8d' }}>
                                                        Confirmed: {formatCurrency(report.confirmedRevenue)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className={styles.statCard}>
                                                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #27ae60, #16a085)' }}>
                                                    <i className="fas fa-receipt"></i>
                                                </div>
                                                <div className={styles.statInfo}>
                                                    <h3 style={{ fontSize: '1.35rem' }}>
                                                        {formatCurrency(report.paidRevenue)}
                                                    </h3>
                                                    <p>Paid Revenue (Collected)</p>
                                                    <p style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#7f8c8d' }}>
                                                        Paid: {report.paymentCounts?.paid || 0} | Unpaid: {report.paymentCounts?.unpaid || 0}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {(() => {
                                            const collectionRate = report.totalRevenue > 0 ? ((report.paidRevenue / report.totalRevenue) * 100).toFixed(1) : '0.0';
                                            const approvalRate = report.totalBookings > 0 ? ((report.confirmedBookings / report.totalBookings) * 100).toFixed(1) : '0.0';
                                            const pendingShare = report.totalBookings > 0 ? ((report.pendingBookings / report.totalBookings) * 100).toFixed(1) : '0.0';

                                            return (
                                                <div className={styles.reportLayout}>
                                                    <div className={`${styles.overviewHeading} ${styles.reportPanel}`}>
                                                        <h3>Executive Summary</h3>
                                                        <div className={styles.reportMetricGrid}>
                                                            <div className={styles.reportMiniCard}>
                                                                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Approval Rate</div>
                                                                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#08054C' }}>{approvalRate}%</div>
                                                            </div>
                                                            <div className={styles.reportMiniCard}>
                                                                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Collection Rate</div>
                                                                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#08054C' }}>{collectionRate}%</div>
                                                            </div>
                                                            <div className={styles.reportMiniCard}>
                                                                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Pending Share</div>
                                                                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#08054C' }}>{pendingShare}%</div>
                                                            </div>
                                                            <div className={styles.reportMiniCard}>
                                                                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Outstanding Revenue</div>
                                                                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#08054C' }}>{formatCurrency(Math.max(report.totalRevenue - report.paidRevenue, 0))}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className={`${styles.overviewHeading} ${styles.reportPanel}`}>
                                                        <h3>Report Notes</h3>
                                                        <div className={styles.reportStack} style={{ color: '#4b5563' }}>
                                                            <div className={styles.listItem} style={{ padding: 0, borderBottom: '1px solid #e5e7eb' }}>
                                                                <span>Coverage Window</span>
                                                                <strong style={{ color: '#08054C' }}>{formatDate(report.startDate)} to {formatDate(report.endDate)}</strong>
                                                            </div>
                                                            <div className={styles.listItem} style={{ padding: 0, borderBottom: '1px solid #e5e7eb' }}>
                                                                <span>Export Package</span>
                                                                <strong style={{ color: '#08054C' }}>Business summary + booking register</strong>
                                                            </div>
                                                            <div className={styles.listItem} style={{ padding: 0, borderBottom: 'none' }}>
                                                                <span>Recommended Use</span>
                                                                <strong style={{ color: '#08054C' }}>Operations review and finance tracking</strong>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className={`${styles.overviewHeading} ${styles.reportPanel} ${styles.reportWide}`}>
                                                        <h3>Trends (Bookings per Day)</h3>
                                                        {(() => {
                                                            const daily = report.trends?.daily || [];
                                                            const values = daily.map(d => d.totalBookings || 0);
                                                            const max = Math.max(1, ...values);
                                                            const points = values
                                                                .map((v, i) => {
                                                                    const x = values.length <= 1 ? 0 : (i / (values.length - 1)) * 100;
                                                                    const y = 100 - (v / max) * 100;
                                                                    return `${x},${y}`;
                                                                })
                                                                .join(' ');

                                                            const first = daily[0]?.date;
                                                            const last = daily[daily.length - 1]?.date;

                                                            return (
                                                                <div>
                                                                    <div style={{ height: 220, borderRadius: 12, background: '#f8f9fa', border: '1px solid #eaeaea', padding: 12 }}>
                                                                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">
                                                                            <polyline
                                                                                fill="none"
                                                                                stroke="#130CB2"
                                                                                strokeWidth="2"
                                                                                points={points}
                                                                            />
                                                                        </svg>
                                                                    </div>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.85rem', color: '#7f8c8d' }}>
                                                                        <span>{first ? formatDate(first) : '—'}</span>
                                                                        <span>{last ? formatDate(last) : '—'}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>

                                                    <div className={`${styles.overviewHeading} ${styles.reportPanel}`}>
                                                        <h3>Bookings by Sport</h3>
                                                        {(() => {
                                                            const entries = Object.entries(report.bookingsBySport || {}).sort((a, b) => (b[1] || 0) - (a[1] || 0));
                                                            const max = Math.max(1, ...entries.map(([, v]) => v || 0));

                                                            return (
                                                                <div className={styles.reportStack}>
                                                                    {entries.map(([label, value]) => (
                                                                        <div key={label}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#2c3e50' }}>
                                                                                <span style={{ fontWeight: 600 }}>{label}</span>
                                                                                <span style={{ fontWeight: 700 }}>{value}</span>
                                                                            </div>
                                                                            <div style={{ height: 10, background: '#eee', borderRadius: 999, overflow: 'hidden' }}>
                                                                                <div style={{ height: 10, width: `${((value || 0) / max) * 100}%`, background: '#3498db' }} />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    {entries.length === 0 && <p style={{ margin: 0, color: '#999', fontStyle: 'italic' }}>No data.</p>}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>

                                                    <div className={`${styles.overviewHeading} ${styles.reportPanel}`}>
                                                        <h3>Paid Revenue by Payment Method</h3>
                                                        {(() => {
                                                            const entries = Object.entries(report.revenueByPaymentMethod || {}).sort((a, b) => (b[1] || 0) - (a[1] || 0));
                                                            const max = Math.max(1, ...entries.map(([, v]) => v || 0));

                                                            return (
                                                                <div className={styles.reportStack}>
                                                                    {entries.map(([label, value]) => (
                                                                        <div key={label}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#2c3e50' }}>
                                                                                <span style={{ fontWeight: 600 }}>{label}</span>
                                                                                <span style={{ fontWeight: 700 }}>{formatCurrency(value || 0)}</span>
                                                                            </div>
                                                                            <div style={{ height: 10, background: '#eee', borderRadius: 999, overflow: 'hidden' }}>
                                                                                <div style={{ height: 10, width: `${((value || 0) / max) * 100}%`, background: '#27ae60' }} />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    {entries.length === 0 && <p style={{ margin: 0, color: '#999', fontStyle: 'italic' }}>No paid revenue in this range.</p>}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>

                                                    <div className={`${styles.overviewHeading} ${styles.reportPanel}`}>
                                                        <h3>Top Customers</h3>
                                                        <div className={styles.tableContainer} style={{ padding: 0 }}>
                                                            <table className={styles.table}>
                                                                <thead>
                                                                    <tr>
                                                                        <th>Customer</th>
                                                                        <th>Bookings</th>
                                                                        <th>Paid</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {(report.topCustomers || []).slice(0, 5).map((customer) => (
                                                                        <tr key={`${customer.email || customer.customer_name || 'unknown'}-${customer.bookings}-${customer.totalAmount}`}>
                                                                            <td>
                                                                                <div style={{ fontWeight: 'bold', color: '#08054C' }}>{customer.customer_name || 'Unknown'}</div>
                                                                                <div style={{ fontSize: '0.8rem' }}>{customer.email || ''}</div>
                                                                            </td>
                                                                            <td>{customer.bookings}</td>
                                                                            <td>{formatCurrency(customer.paidAmount || 0)}</td>
                                                                        </tr>
                                                                    ))}
                                                                    {(report.topCustomers || []).length === 0 && (
                                                                        <tr>
                                                                            <td colSpan={3} style={{ textAlign: 'center', padding: '1.25rem' }}>No customers found.</td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>

                                                    <div className={`${styles.overviewHeading} ${styles.reportPanel}`}>
                                                        <h3>Peak Hours</h3>
                                                        {(() => {
                                                            const toHourLabel = (hourKey: string) => {
                                                                const hour = Number(hourKey);
                                                                const ampm = hour >= 12 ? 'PM' : 'AM';
                                                                const hour12 = hour % 12 || 12;
                                                                return `${hour12}:00 ${ampm}`;
                                                            };

                                                            return (
                                                                <div className={styles.reportStack}>
                                                                    {(report.peakHours || []).slice(0, 5).map((entry) => (
                                                                        <div key={entry.hour} className={styles.listItem}>
                                                                            <div>
                                                                                <strong>{toHourLabel(entry.hour)}</strong>
                                                                            </div>
                                                                            <span className={`${styles.status} ${styles.statusPending}`}>
                                                                                {entry.bookings} bookings
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                    {(report.peakHours || []).length === 0 && (
                                                                        <p style={{ margin: 0, color: '#999', fontStyle: 'italic' }}>No data.</p>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </>
                                )}
                            </div>
                        )}

                        {activeSection === 'blocked-slots' && (
                            <div className="animate-fade-in">
                                <div className={styles.overviewHeading} style={{ marginBottom: '1.5rem' }}>
                                    <h3>Block a New Time Slot</h3>
                                    <form onSubmit={handleCreateBlock} className={styles.blockForm}>
                                        <div className={styles.blockField}>
                                            <input
                                                type="text"
                                                placeholder="Event Name (e.g. Maintenance)"
                                                value={newBlock.name}
                                                required
                                                onChange={(e) => setNewBlock({ ...newBlock, name: e.target.value })}
                                            />
                                        </div>
                                        <div className={styles.blockField}>
                                            <input
                                                type="date"
                                                value={newBlock.booking_date}
                                                required
                                                onChange={(e) => setNewBlock({ ...newBlock, booking_date: e.target.value })}
                                            />
                                        </div>
                                        <div className={styles.blockField}>
                                            <input
                                                type="time"
                                                value={newBlock.start_time}
                                                required
                                                onChange={(e) => setNewBlock({ ...newBlock, start_time: e.target.value })}
                                            />
                                        </div>
                                        <div className={styles.blockField}>
                                            <input
                                                type="time"
                                                value={newBlock.end_time}
                                                required
                                                onChange={(e) => setNewBlock({ ...newBlock, end_time: e.target.value })}
                                            />
                                        </div>
                                        <div className={styles.blockField}>
                                            <select
                                                value={newBlock.sport_id}
                                                onChange={(e) => setNewBlock({ ...newBlock, sport_id: e.target.value })}
                                            >
                                                <option value="">All Sports</option>
                                                {sports.map((sportItem) => (
                                                    <option key={sportItem.id} value={sportItem.id.toString()}>
                                                        {sportItem.display_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <button type="submit" className={`${styles.actionButton} ${styles.approveBtn} ${styles.blockSubmit}`}>
                                            Block Slot
                                        </button>
                                    </form>
                                </div>

                                <div className={styles.tableContainer}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Event/Reason</th>
                                                <th>Sport</th>
                                                <th>Date</th>
                                                <th>Time Range</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {blockedSlots.map(block => (
                                                <tr key={block.id}>
                                                    <td style={{ fontWeight: 'bold', color: '#08054C' }}>{block.name}</td>
                                                    <td>{block.sports?.display_name || 'All Sports'}</td>
                                                    <td>{formatDate(block.booking_date)}</td>
                                                    <td>{formatTimeToAMPM(block.start_time)} - {formatTimeToAMPM(block.end_time)}</td>
                                                    <td>
                                                        <button
                                                            className={`${styles.actionButton} ${styles.rejectBtn}`}
                                                            onClick={() => handleDeleteBlock(block.id)}
                                                            title="Remove Block"
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {blockedSlots.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No blocked slots currently active.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {selectedBooking && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }} onClick={() => setSelectedBooking(null)}>
                    <div style={{
                        background: 'white',
                        padding: '2rem',
                        borderRadius: '10px',
                        maxWidth: '600px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflowY: 'auto'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '2px solid #f0f0f0', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, color: '#08054C', fontSize: '1.5rem' }}>Booking Details</h3>
                                <p style={{ margin: '0.2rem 0 0', color: '#666', fontWeight: 'bold' }}>ID: #{selectedBooking.id}</p>
                            </div>
                            <button
                                onClick={() => setSelectedBooking(null)}
                                style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: '#999' }}
                            >
                                &times;
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                                <h4 style={{ color: '#000', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                                    <i className="fas fa-user-circle" style={{ marginRight: '0.5rem' }}></i> Customer Info
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    <p style={{ margin: 0, color: '#000' }}><strong>Name:</strong> {selectedBooking.customer_name}</p>
                                    <p style={{ margin: 0, color: '#000' }}><strong>Email:</strong> {selectedBooking.email}</p>
                                    <p style={{ margin: 0, color: '#000' }}><strong>Phone:</strong> {selectedBooking.phone}</p>
                                </div>
                            </div>
                            <div>
                                <h4 style={{ color: '#000', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                                    <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i> Booking Info
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    <p style={{ margin: 0, color: '#000' }}><strong>Sport:</strong> {selectedBooking.sports?.display_name}</p>
                                    <p style={{ margin: 0, color: '#000' }}><strong>Date:</strong> {formatDate(selectedBooking.booking_date)}</p>
                                    <p style={{ margin: 0, color: '#000' }}><strong>Time:</strong> {formatTimeToAMPM(selectedBooking.start_time)} - {formatTimeToAMPM(selectedBooking.end_time)}</p>
                                    <p style={{ margin: 0, color: '#000' }}><strong>Rental Option:</strong> {selectedBooking.rental_option || 'Standard'}</p>
                                    <p style={{ margin: 0, color: '#000' }}><strong>Amount:</strong> {formatCurrency(selectedBooking.amount)}</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <strong>Booking Status:</strong>
                                            <span className={`${styles.status} ${selectedBooking.status === 'confirmed' ? styles.statusConfirmed :
                                                selectedBooking.status === 'pending' ? styles.statusPending : styles.statusCancelled
                                                }`}>
                                                {selectedBooking.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <strong>Payment Status:</strong>
                                            {(() => {
                                                const badge = getPaymentStatusBadge(selectedBooking.payment_status);
                                                return (
                                                    <span className={`${styles.status} ${badge.className}`}>
                                                        {badge.label}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', background: '#f9f9f9', borderLeft: '4px solid #27ae60' }}>
                            <h4 style={{ color: '#000', margin: '0 0 0.5rem 0' }}>Payment & Receipt</h4>
                            <p style={{ margin: '0.3rem 0', color: '#000' }}><strong>Payment Method:</strong> {selectedBooking.payment_method || 'Cash Payment'}</p>
                            <p style={{ margin: '0.3rem 0', color: '#000', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <strong>Payment Status:</strong>
                                {(() => {
                                    const badge = getPaymentStatusBadge(selectedBooking.payment_status);
                                    return (
                                        <span className={`${styles.status} ${badge.className}`}>
                                            {badge.label}
                                        </span>
                                    );
                                })()}
                            </p>
                            <p style={{ margin: '0.3rem 0', color: '#000' }}><strong>Receipt / Reference:</strong> {selectedBooking.payment_id || `BK-${selectedBooking.id}`}</p>
                        </div>

                        <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', background: '#f9f9f9', borderLeft: '4px solid #f39c12' }}>
                            <h4 style={{ color: '#000', margin: '0 0 0.5rem 0' }}>Timeline</h4>
                            {selectedHistoryLoading ? (
                                <p style={{ margin: 0, color: '#666' }}>Loading timeline…</p>
                            ) : (
                                (() => {
                                    const getActionTime = (action: string) =>
                                        selectedBookingHistory.find(entry => entry.action === action)?.created_at;

                                    const createdAt = getActionTime('created') || selectedBooking.created_at;
                                    const approvedAt = getActionTime('approved') || selectedBooking.approved_at;
                                    const paidAt = getActionTime('paid');
                                    const cancelledAt =
                                        getActionTime('cancelled') ||
                                        getActionTime('rejected') ||
                                        selectedBooking.cancelled_at ||
                                        selectedBooking.rejected_at;

                                    const paymentStatus = normalizePaymentStatus(selectedBooking.payment_status);
                                    const isCancelled = selectedBooking.status === 'cancelled';

                                    const steps = isCancelled
                                        ? [
                                            { label: 'Created', time: createdAt, done: true },
                                            { label: 'Cancelled', time: cancelledAt, done: true },
                                            { label: 'Paid', time: paidAt, done: paymentStatus === 'paid' },
                                        ]
                                        : [
                                            { label: 'Created', time: createdAt, done: true },
                                            { label: 'Approved', time: approvedAt, done: selectedBooking.status === 'confirmed' },
                                            { label: 'Paid', time: paidAt, done: paymentStatus === 'paid' },
                                        ];

                                    return (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem' }}>
                                            {steps.map(step => (
                                                <div
                                                    key={step.label}
                                                    style={{
                                                        background: '#fff',
                                                        borderRadius: '8px',
                                                        padding: '0.75rem',
                                                        border: `1px solid ${step.done ? '#c8f7d2' : '#eee'}`,
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                                                        <strong style={{ color: '#08054C' }}>{step.label}</strong>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: step.done ? '#27ae60' : '#999' }}>
                                                            {step.done ? 'DONE' : 'PENDING'}
                                                        </span>
                                                    </div>
                                                    <div style={{ marginTop: '0.35rem', fontSize: '0.85rem', color: '#666' }}>
                                                        {step.time ? formatDateTime(step.time) : '—'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()
                            )}
                        </div>

                        {(selectedBooking.rejection_reason || selectedBooking.approved_by || selectedBooking.rejected_by || selectedBooking.cancelled_by) && (
                            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f9f9f9', borderRadius: '8px', borderLeft: '4px solid #130CB2' }}>
                                <h4 style={{ color: '#08054C', margin: '0 0 0.5rem 0' }}>Process History</h4>
                                {selectedBooking.status === 'confirmed' && selectedBooking.approved_by && (
                                    <>
                                        <p className={styles.processHistoryApproved} style={{ margin: '0.2rem 0' }}><strong>Approved by:</strong> {selectedBooking.approved_by}</p>
                                        <p className={styles.processHistoryApproved} style={{ margin: '0.2rem 0' }}><strong>Approved at:</strong> {formatDateTime(selectedBooking.approved_at)}</p>
                                    </>
                                )}
                                {selectedBooking.status === 'cancelled' && selectedBooking.rejected_by && (
                                    <>
                                        <p className={styles.processHistoryRejected} style={{ margin: '0.2rem 0' }}><strong>Rejected by:</strong> {selectedBooking.rejected_by}</p>
                                        <p className={styles.processHistoryRejected} style={{ margin: '0.2rem 0' }}><strong>Rejected at:</strong> {formatDateTime(selectedBooking.rejected_at)}</p>
                                    </>
                                )}
                                {selectedBooking.cancelled_by && (
                                    <>
                                        <p style={{ margin: '0.2rem 0' }}><strong>Cancelled by:</strong> {selectedBooking.cancelled_by}</p>
                                        <p style={{ margin: '0.2rem 0' }}><strong>Cancelled at:</strong> {formatDateTime(selectedBooking.cancelled_at)}</p>
                                    </>
                                )}
                                {selectedBooking.rejection_reason && (
                                    <p style={{ margin: '0.5rem 0 0 0', padding: '0.5rem', background: '#fff', borderRadius: '4px', border: '1px solid #eee', color: '#e74c3c' }}>
                                        <strong>Reason:</strong> {selectedBooking.rejection_reason}
                                    </p>
                                )}
                            </div>
                        )}

                        <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                                <button
                                    onClick={() => void handleDeleteBooking(selectedBooking)}
                                    className={`${styles.actionButton} ${styles.deleteBtn}`}
                                    style={{ padding: '0.8rem 2rem', borderRadius: '30px', fontWeight: 'bold', marginRight: 'auto' }}
                                    disabled={deletingBookingId === selectedBooking.id}
                                >
                                    <i className={deletingBookingId === selectedBooking.id ? 'fas fa-spinner fa-spin' : 'fas fa-trash'} style={{ marginRight: '0.5rem' }}></i>
                                    {deletingBookingId === selectedBooking.id ? 'Deleting…' : 'Delete Booking'}
                                </button>
                                <button
                                    onClick={() => handleResendEmail(selectedBooking)}
                                    className={`${styles.actionButton} ${styles.viewBtn}`}
                                    style={{ padding: '0.8rem 2rem', borderRadius: '30px', fontWeight: 'bold' }}
                                    disabled={emailSendingId === selectedBooking.id}
                                >
                                    {emailSendingId === selectedBooking.id ? 'Sending Email…' : 'Resend Status Email'}
                                </button>

                                {selectedBooking.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => handleApprove(selectedBooking.id)}
                                            className={`${styles.actionButton} ${styles.approveBtn}`}
                                            style={{ padding: '0.8rem 2rem', borderRadius: '30px', fontWeight: 'bold' }}
                                        >
                                            Approve Booking
                                        </button>
                                        <button
                                            onClick={() => handleReject(selectedBooking.id)}
                                            className={`${styles.actionButton} ${styles.rejectBtn}`}
                                            style={{ padding: '0.8rem 2rem', borderRadius: '30px', fontWeight: 'bold' }}
                                        >
                                            Reject Booking
                                        </button>
                                    </>
                                )}

                                {selectedBooking.status === 'confirmed' && (
                                    <>
                                        {normalizePaymentStatus(selectedBooking.payment_status) !== 'paid' && (
                                            <button
                                                onClick={() => handleMarkPaid(selectedBooking.id)}
                                                className={`${styles.actionButton} ${styles.paidBtn}`}
                                                style={{ padding: '0.8rem 2rem', borderRadius: '30px', fontWeight: 'bold' }}
                                            >
                                                Mark as Paid
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleCancel(selectedBooking.id)}
                                            className={`${styles.actionButton} ${styles.rejectBtn}`}
                                            style={{ padding: '0.8rem 2rem', borderRadius: '30px', fontWeight: 'bold' }}
                                        >
                                            Cancel Booking
                                        </button>
                                    </>
                                )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
