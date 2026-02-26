const express = require('express');
const router = express.Router();
const supabase = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST admin login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password required' });
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
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ success: false, error: 'Month and year required' });
        }

        // Calculate date range
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('*, sports(name, display_name, price)')
            .gte('booking_date', startDate)
            .lte('booking_date', endDate)
            .order('booking_date');

        if (error) throw error;

        // Calculate report data
        const report = {
            month,
            year,
            totalBookings: bookings.length,
            totalRevenue: bookings.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0),
            confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
            pendingBookings: bookings.filter(b => b.status === 'pending').length,
            cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
            bookings: bookings
        };

        res.json({ success: true, data: report });
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
