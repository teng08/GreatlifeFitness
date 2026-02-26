'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Image from 'next/image';
import type { Booking, AdminStats, Sport } from '@/lib/types';
import { formatDate, formatTimeToAMPM, formatCurrency, getStatusColor } from '@/lib/utils';
import styles from './dashboard.module.css';

export default function AdminDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [sports, setSports] = useState<Sport[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
    const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<'overview' | 'reservations' | 'blocked-slots'>('overview');
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

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
        const adminUser = localStorage.getItem('adminUser');
        if (!adminUser) {
            router.push('/login'); // Redirect to login if not authenticated
            return;
        }
        setUser(JSON.parse(adminUser));
        loadData();
    }, [router]);

    useEffect(() => {
        applyFilters();
    }, [bookings, filters, sports]);

    const normalizeSportKey = (value?: string | null) =>
        (value || '').toLowerCase().trim().replace(/\s+/g, '-');

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

    const applyFilters = () => {
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
    };

    const handleApprove = async (id: number) => {
        console.log('Approve action triggered for ID:', id);
        if (!confirm('Are you sure you want to approve this booking?')) {
            console.log('Approve cancelled by user');
            return;
        }

        try {
            console.log('Calling api.approveBooking...');
            const response = await api.approveBooking(id, 'Peter Johnwyn A. Quirimit');
            console.log('Approve response:', response);
            if (response.success) {
                alert('Booking approved successfully!');
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
            const response = await api.rejectBooking(id, 'Peter Johnwyn A. Quirimit', reason || 'No reason provided');
            console.log('Reject response:', response);
            if (response.success) {
                alert('Booking rejected successfully!');
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
                    <h1>Employee Dashboard</h1>
                    <p>Manage bookings and court reservations</p>
                </header>

                <div className={styles.dashboard}>
                    {/* Sidebar */}
                    <div className={styles.sidebar}>
                        <div className={styles.logo}>
                            <h2><i className="fas fa-dumbbell"></i> CourtMaster</h2>
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
                            <h2 style={{ margin: 0, color: '#08054C' }}>
                                {activeSection === 'overview' ? 'Reservation Dashboard' :
                                    activeSection === 'reservations' ? 'Manage Reservations' : 'Manage Blocked Slots'}
                            </h2>
                            <div className={styles.userInfo}>
                                <Image
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent('Peter Johnwyn A. Quirimit')}&background=3498db&color=fff`}
                                    alt="User"
                                    width={40}
                                    height={40}
                                    style={{ borderRadius: '50%' }}
                                />
                                <div>
                                    <h4>Peter Johnwyn A. Quirimit</h4>
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
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredBookings.map(booking => (
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
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredBookings.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No bookings found matching filters.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
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
                <footer className={styles.footer}>
                    <p>Sports Court Booking System - Employee Dashboard</p>
                </footer>
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
                                    <p style={{ margin: 0, color: '#000', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <strong>Status:</strong>
                                        <span className={`${styles.status} ${selectedBooking.status === 'confirmed' ? styles.statusConfirmed :
                                            selectedBooking.status === 'pending' ? styles.statusPending : styles.statusCancelled
                                            }`}>
                                            {selectedBooking.status.toUpperCase()}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '8px', background: '#f9f9f9', borderLeft: '4px solid #27ae60' }}>
                            <h4 style={{ color: '#000', margin: '0 0 0.5rem 0' }}>Payment & Receipt</h4>
                            <p style={{ margin: '0.3rem 0', color: '#000' }}><strong>Payment Method:</strong> {selectedBooking.payment_method || 'Cash Payment'}</p>
                            <p style={{ margin: '0.3rem 0', color: '#000' }}><strong>Payment Status:</strong> {selectedBooking.payment_status || 'pending'}</p>
                            <p style={{ margin: '0.3rem 0', color: '#000' }}><strong>Receipt / Reference:</strong> {selectedBooking.payment_id || `BK-${selectedBooking.id}`}</p>
                        </div>

                        {(selectedBooking.rejection_reason || selectedBooking.approved_by || selectedBooking.rejected_by) && (
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

                        {selectedBooking.status === 'pending' && (
                            <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
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
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
