const express = require('express');
const router = express.Router();
const supabase = require('../config/database');

// GET all blocked slots
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('blocked_slots')
            .select(`
                *,
                sports (
                    name,
                    display_name
                )
            `)
            .order('booking_date', { ascending: true })
            .order('start_time', { ascending: true });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching blocked slots:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST create blocked slot
router.post('/', async (req, res) => {
    try {
        const { sport_id, name, booking_date, start_time, end_time } = req.body;

        if (!name || !booking_date || !start_time || !end_time) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const { data, error } = await supabase
            .from('blocked_slots')
            .insert([{
                sport_id: sport_id || null,
                name,
                booking_date,
                start_time,
                end_time
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Error creating blocked slot:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE blocked slot
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('blocked_slots')
            .delete()
            .eq('id', parseInt(id));

        if (error) throw error;
        res.json({ success: true, message: 'Blocked slot deleted' });
    } catch (error) {
        console.error('Error deleting blocked slot:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
