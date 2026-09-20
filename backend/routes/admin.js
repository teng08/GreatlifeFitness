const express = require('express');
const router = express.Router();
const supabase = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { requireAdmin } = require('../middleware/auth');

// POST admin login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Admin ID and password required' });
        }

        // Get user from database
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    full_name: user.full_name,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.use(requireAdmin);

// GET dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        // Get all bookings
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*, sports(name, display_name)');

        if (error) throw error;

        // Calculate statistics
        const stats = {
            total: bookings.length,
            pending: bookings.filter(b => b.status === 'pending').length,
            confirmed: bookings.filter(b => b.status === 'confirmed').length,
            cancelled: bookings.filter(b => b.status === 'cancelled').length,
            bySport: {}
        };

        // Count by sport
        bookings.forEach(booking => {
            const sportName = booking.sports?.name || 'unknown';
            if (!stats.bySport[sportName]) {
                stats.bySport[sportName] = 0;
            }
            stats.bySport[sportName]++;
        });

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET monthly reports
router.get('/reports', async (req, res) => {
    try {
        const { month, year, start, end, startDate, endDate } = req.query;

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const rangeStart = (startDate || start || '').toString();
        const rangeEnd = (endDate || end || '').toString();

        const hasRange = rangeStart && rangeEnd;
        const hasMonth = month && year;

        if (!hasRange && !hasMonth) {
            return res.status(400).json({
                success: false,
                error: 'Provide either (month, year) or (startDate, endDate)'
            });
        }

        // Calculate date range
        let reportStartDate;
        let reportEndDate;

        if (hasRange) {
            if (!dateRegex.test(rangeStart) || !dateRegex.test(rangeEnd)) {
                return res.status(400).json({
                    success: false,
                    error: 'startDate and endDate must be in YYYY-MM-DD format'
                });
            }

            if (rangeStart > rangeEnd) {
                return res.status(400).json({
                    success: false,
                    error: 'startDate must be before or equal to endDate'
                });
            }

            reportStartDate = rangeStart;
            reportEndDate = rangeEnd;
        } else {
            const safeMonth = month.toString().padStart(2, '0');
            const safeYear = year.toString();

            reportStartDate = `${safeYear}-${safeMonth}-01`;
            reportEndDate = new Date(Number(safeYear), Number(safeMonth), 0).toISOString().split('T')[0];
        }

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*, sports(name, display_name, price)')
            .gte('booking_date', reportStartDate)
            .lte('booking_date', reportEndDate)
            .order('booking_date');

        if (error) throw error;

        const safeParseAmount = (value) => {
            const parsed = parseFloat(value || 0);
            return Number.isFinite(parsed) ? parsed : 0;
        };

        const getHourKey = (timeValue) => {
            if (!timeValue) return null;
            const [hourRaw] = timeValue.toString().split(':');
            const hour = Number(hourRaw);
            if (!Number.isFinite(hour)) return null;
            return String(hour).padStart(2, '0');
        };

        const statusCounts = {
            pending: 0,
            confirmed: 0,
            cancelled: 0
        };

        const paymentCounts = {
            unpaid: 0,
            paid: 0
        };

        const bookingsBySport = {};
        const paidRevenueByPaymentMethod = {};
        const customerMap = new Map();
        const peakHourMap = new Map();
        const dailyTrendMap = new Map();

        let totalRevenue = 0;
        let confirmedRevenue = 0;
        let paidRevenue = 0;

        bookings.forEach((booking) => {
            const amount = safeParseAmount(booking.amount);
            const bookingStatus = booking.status;
            const paymentStatus = booking.payment_status === 'paid' ? 'paid' : 'unpaid';

            totalRevenue += amount;

            if (bookingStatus === 'pending') statusCounts.pending += 1;
            if (bookingStatus === 'confirmed') statusCounts.confirmed += 1;
            if (bookingStatus === 'cancelled') statusCounts.cancelled += 1;

            if (paymentStatus === 'paid') {
                paymentCounts.paid += 1;
                paidRevenue += amount;
            } else {
                paymentCounts.unpaid += 1;
            }

            if (bookingStatus === 'confirmed') {
                confirmedRevenue += amount;
            }

            const sportKey = booking.sports?.display_name || booking.sports?.name || 'Unknown';
            bookingsBySport[sportKey] = (bookingsBySport[sportKey] || 0) + 1;

            if (paymentStatus === 'paid') {
                const method = booking.payment_method || 'Unknown';
                paidRevenueByPaymentMethod[method] = (paidRevenueByPaymentMethod[method] || 0) + amount;
            }

            const customerKey = booking.email || booking.customer_name || `customer-${booking.id}`;
            const existingCustomer = customerMap.get(customerKey) || {
                email: booking.email || null,
                customer_name: booking.customer_name || null,
                phone: booking.phone || null,
                bookings: 0,
                totalAmount: 0,
                confirmedAmount: 0,
                paidAmount: 0
            };

            existingCustomer.bookings += 1;
            existingCustomer.totalAmount += amount;
            if (bookingStatus === 'confirmed') existingCustomer.confirmedAmount += amount;
            if (paymentStatus === 'paid') existingCustomer.paidAmount += amount;

            customerMap.set(customerKey, existingCustomer);

            const hourKey = getHourKey(booking.start_time);
            if (hourKey) {
                peakHourMap.set(hourKey, (peakHourMap.get(hourKey) || 0) + 1);
            }

            const dateKey = booking.booking_date;
            const dailyExisting = dailyTrendMap.get(dateKey) || {
                date: dateKey,
                totalBookings: 0,
                confirmedBookings: 0,
                paidBookings: 0,
                totalRevenue: 0,
                confirmedRevenue: 0,
                paidRevenue: 0
            };

            dailyExisting.totalBookings += 1;
            dailyExisting.totalRevenue += amount;
            if (bookingStatus === 'confirmed') {
                dailyExisting.confirmedBookings += 1;
                dailyExisting.confirmedRevenue += amount;
            }
            if (paymentStatus === 'paid') {
                dailyExisting.paidBookings += 1;
                dailyExisting.paidRevenue += amount;
            }

            dailyTrendMap.set(dateKey, dailyExisting);
        });

        const topCustomers = Array.from(customerMap.values())
            .sort((a, b) => (b.bookings - a.bookings) || (b.totalAmount - a.totalAmount))
            .slice(0, 10);

        const peakHours = Array.from(peakHourMap.entries())
            .map(([hour, count]) => ({ hour, bookings: count }))
            .sort((a, b) => b.bookings - a.bookings)
            .slice(0, 10);

        const dailyTrends = Array.from(dailyTrendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        const report = {
            month: hasMonth ? month : undefined,
            year: hasMonth ? year : undefined,
            startDate: reportStartDate,
            endDate: reportEndDate,
            totalBookings: bookings.length,
            confirmedBookings: statusCounts.confirmed,
            pendingBookings: statusCounts.pending,
            cancelledBookings: statusCounts.cancelled,
            totalRevenue,
            confirmedRevenue,
            paidRevenue,
            paymentCounts,
            bookingsBySport,
            revenueByPaymentMethod: paidRevenueByPaymentMethod,
            topCustomers,
            peakHours,
            trends: {
                daily: dailyTrends
            },
            bookings
        };

        res.json({ success: true, data: report });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
