const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
const bookingsRoutes = require('./routes/bookings');
const sportsRoutes = require('./routes/sports');
const adminRoutes = require('./routes/admin');
const blockedSlotsRoutes = require('./routes/blocked_slots');

app.use('/api/bookings', bookingsRoutes);
app.use('/api/sports', sportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/blocked-slots', blockedSlotsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'GreatLife Booking API is running',
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to GreatLife Fitness Booking API',
        version: '1.0.0',
        endpoints: {
            bookings: '/api/bookings',
            sports: '/api/sports',
            admin: '/api/admin',
            health: '/api/health'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 GreatLife Booking API Server running on port ${PORT}`);
    console.log(`📍 API URL: http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
