-- SQL for creating blocked_slots table
CREATE TABLE IF NOT EXISTS blocked_slots (
  id SERIAL PRIMARY KEY,
  sport_id INTEGER REFERENCES sports(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- Reason for blocking (e.g., 'Tournament', 'Maintenance')
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_blocked_slots_date ON blocked_slots(booking_date);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_sport_id ON blocked_slots(sport_id);
