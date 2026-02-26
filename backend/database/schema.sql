-- GreatLife Fitness Booking System Database Schema
-- PostgreSQL / Supabase

-- Sports/Courts Table
CREATE TABLE IF NOT EXISTS sports (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  max_people INTEGER DEFAULT 15,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  sport_id INTEGER REFERENCES sports(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(11) NOT NULL,
  people_count INTEGER NOT NULL CHECK (people_count > 0 AND people_count <= 15),
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'Cash Payment',
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  rental_option VARCHAR(100),
  payment_id VARCHAR(100),
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  rejected_by VARCHAR(255),
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  cancelled_by VARCHAR(255),
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users Table (for admin authentication)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Booking History Table (audit trail)
CREATE TABLE IF NOT EXISTS booking_history (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  performed_by VARCHAR(255),
  changes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_sport_id ON bookings(sport_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email);
CREATE INDEX IF NOT EXISTS idx_booking_history_booking_id ON booking_history(booking_id);

-- Insert initial sports data
INSERT INTO sports (name, display_name, description, price, max_people) VALUES
  ('basketball', 'Basketball Court', 'Full court with professional hoops', 800.00, 15),
  ('table-tennis', 'Table Tennis', 'Table tennis facilities', 400.00, 4),
  ('badminton', 'Badminton Court', 'Professional badminton court', 600.00, 4)
ON CONFLICT (name) DO NOTHING;

-- Insert default admin user (password: admin123 - CHANGE THIS IN PRODUCTION!)
-- Password hash generated with bcrypt for 'admin123'
INSERT INTO users (username, password_hash, full_name, role) VALUES
  ('admin', '$2a$10$XQZ9cKvKJ7YZ5Z5Z5Z5Z5eO5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', 'Peter Johnwyn A. Quirimit', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Note: You'll need to generate a proper bcrypt hash for the admin password
-- You can use this Node.js code to generate it:
-- const bcrypt = require('bcryptjs');
-- const hash = bcrypt.hashSync('your_password', 10);
-- console.log(hash);
