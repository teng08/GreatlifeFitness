const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkColumn() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to select the specific column
    const { data, error } = await supabase
        .from('bookings')
        .select('rental_option')
        .limit(1);

    if (error) {
        console.log('Error selecting rental_option (Column likely missing):', error.message);
    } else {
        console.log('Column rental_option exists.');
    }
}

checkColumn();
