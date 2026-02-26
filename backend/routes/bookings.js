const express = require('express');
const router = express.Router();
const supabase = require('../config/database');
const { sendConfirmationEmail, sendApprovalEmail } = require('../services/emailService');

// GET all bookings with optional filters
router.get('/', async (req, res) => {
    try {
        const { sport, status, date, search } = req.query;

        let query = supabase
            .from('bookings')
            .select(`
        *,
        sports (
          name,
          display_name,
          price
        )
      `)
            .order('created_at', { ascending: false });

        // Apply filters
        if (sport) {
            query = query.eq('sport_id', sport);
        }
        if (status) {
            query = query.eq('status', status);
        }
        if (date) {
            query = query.eq('booking_date', date);
        }
        if (search) {
            query = query.or(`customer_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET single booking by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('bookings')
            .select(`
        *,
        sports (
          name,
          display_name,
          price
        )
      `)
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST create new booking
router.post('/', async (req, res) => {
    try {
        const {
            sport_id,
            customer_name,
            email,
            phone,
            people_count,
            booking_date,
            start_time,
            end_time,
            amount,
            rental_option
        } = req.body;

        // Validation
        if (!sport_id || !customer_name || !email || !phone || !people_count || !booking_date || !start_time || !end_time || !amount || !rental_option) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Check for existing bookings on the same date and overlapping time
        // Check both 'pending' and 'confirmed' bookings to prevent double-booking
        const { data: existingBookings, error: checkError } = await supabase
            .from('bookings')
            .select('*')
            .eq('sport_id', sport_id)
            .eq('booking_date', booking_date)
            .in('status', ['pending', 'confirmed'])
            .or(`and(start_time.lte.${end_time},end_time.gte.${start_time})`);

        if (checkError) throw checkError;

        if (existingBookings && existingBookings.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Time slot already booked. Please choose a different time.'
            });
        }

        // Check for blocked slots
        const { data: blockedSlots, error: blockedError } = await supabase
            .from('blocked_slots')
            .select('*')
            .eq('booking_date', booking_date)
            .or(`and(start_time.lte.${end_time},end_time.gte.${start_time})`);

        if (blockedError) throw blockedError;

        // If there's a block that applies to ALL sports (sport_id is null) or specifically to this sport
        const isBlocked = blockedSlots.some(block => !block.sport_id || block.sport_id === sport_id);

        if (isBlocked) {
            return res.status(409).json({
                success: false,
                error: 'This time slot is blocked for an event. Please choose a different time.'
            });
        }

        // Create booking
        const { data, error } = await supabase
            .from('bookings')
            .insert([{
                sport_id,
                customer_name,
                email,
                phone,
                people_count,
                booking_date,
                start_time,
                end_time,
                amount,
                rental_option,
                payment_method: 'Cash Payment',
                status: 'pending',
                payment_status: 'pending',
                payment_id: `CASH_${Date.now()}`
            }])
            .select(`
        *,
        sports (
          name,
          display_name,
          price
        )
      `)
            .single();

        if (error) throw error;

        // Send confirmation email
        const emailData = {
            ...data,
            sport_name: data.sports.display_name
        };
        await sendConfirmationEmail(emailData);

        // Log booking creation
        await supabase
            .from('booking_history')
            .insert([{
                booking_id: data.id,
                action: 'created',
                performed_by: customer_name,
                changes: { status: 'pending' }
            }]);

        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT update booking
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Remove fields that shouldn't be updated directly
        delete updates.id;
        delete updates.created_at;
        delete updates.sports;

        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('bookings')
            .update(updates)
            .eq('id', id)
            .select(`
        *,
        sports (
          name,
          display_name,
          price
        )
      `)
            .single();

        if (error) throw error;

        // Log update
        await supabase
            .from('booking_history')
            .insert([{
                booking_id: id,
                action: 'updated',
                performed_by: updates.approved_by || updates.rejected_by || updates.cancelled_by || 'System',
                changes: updates
            }]);

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT approve booking
router.put('/:id/approve', async (req, res) => {
    console.log(`[APPROVE] Request received for ID: ${req.params.id}`);
    try {
        const { id } = req.params;
        const { approved_by } = req.body;
        console.log(`[APPROVE] Approved by: ${approved_by}`);

        const { data, error } = await supabase
            .from('bookings')
            .update({
                status: 'confirmed',
                payment_status: 'paid',
                approved_by: approved_by || 'Admin',
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select(`
        *,
        sports (
          name,
          display_name,
          price
        )
      `)
            .single();

        if (error) throw error;

        // Send approval email
        const emailData = {
            ...data,
            sport_name: data.sports.display_name
        };
        await sendApprovalEmail(emailData);

        // Log approval
        await supabase
            .from('booking_history')
            .insert([{
                booking_id: id,
                action: 'approved',
                performed_by: approved_by || 'Admin',
                changes: { status: 'confirmed', payment_status: 'paid' }
            }]);

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error approving booking:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT reject booking
router.put('/:id/reject', async (req, res) => {
    console.log(`[REJECT] Request received for ID: ${req.params.id}`);
    try {
        const { id } = req.params;
        const { rejected_by, rejection_reason } = req.body;
        console.log(`[REJECT] Rejected by: ${rejected_by}, Reason: ${rejection_reason}`);

        const { data, error } = await supabase
            .from('bookings')
            .update({
                status: 'cancelled',
                rejected_by: rejected_by || 'Admin',
                rejected_at: new Date().toISOString(),
                rejection_reason: rejection_reason || 'No reason provided',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select(`
        *,
        sports (
          name,
          display_name,
          price
        )
      `)
            .single();

        if (error) throw error;

        // Log rejection
        await supabase
            .from('booking_history')
            .insert([{
                booking_id: id,
                action: 'rejected',
                performed_by: rejected_by || 'Admin',
                changes: { status: 'cancelled', rejection_reason }
            }]);

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error rejecting booking:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT cancel booking
router.put('/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const { cancelled_by } = req.body;

        const { data, error } = await supabase
            .from('bookings')
            .update({
                status: 'cancelled',
                cancelled_by: cancelled_by || 'Admin',
                cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select(`
        *,
        sports (
          name,
          display_name,
          price
        )
      `)
            .single();

        if (error) throw error;

        // Log cancellation
        await supabase
            .from('booking_history')
            .insert([{
                booking_id: id,
                action: 'cancelled',
                performed_by: cancelled_by || 'Admin',
                changes: { status: 'cancelled' }
            }]);

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE booking
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('bookings')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
