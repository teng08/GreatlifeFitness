const express = require('express');
const router = express.Router();
const supabase = require('../config/database');

// GET all sports
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sports')
            .select('*')
            .order('name');

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching sports:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET single sport by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('sports')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ success: false, error: 'Sport not found' });
        }

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching sport:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
