const express = require('express');
const router = express.Router();
const supabase = require('../config/database');

// Court details are part of the site content, so keep them available even when
// the database is temporarily unreachable. Mutating endpoints still require a
// working database connection.
const fallbackSports = [
    {
        id: 1,
        name: 'basketball',
        display_name: 'Basketball Court',
        description: 'Full court with professional hoops',
        price: 800,
        max_people: 15,
        created_at: null
    },
    {
        id: 2,
        name: 'table-tennis',
        display_name: 'Table Tennis',
        description: 'Table tennis facilities',
        price: 400,
        max_people: 4,
        created_at: null
    },
    {
        id: 3,
        name: 'badminton',
        display_name: 'Badminton Court',
        description: 'Professional badminton court',
        price: 600,
        max_people: 4,
        created_at: null
    }
];

// GET all sports
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sports')
            .select('*')
            .order('name');

        if (error) throw error;

        if (!data || data.length === 0) {
            return res.json({
                success: true,
                data: fallbackSports,
                warning: 'The sports table is empty. Using built-in court details.'
            });
        }

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching sports:', error);
        res.json({
            success: true,
            data: fallbackSports,
            warning: 'The booking database is unavailable. Using built-in court details.'
        });
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
