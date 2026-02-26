const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function ensurePendingBooking() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for existing pending booking
    const { data: existing, error: fetchError } = await supabase
        .from('bookings')
        .select('id')
        .eq('status', 'pending')
        .limit(1);

    if (fetchError) {
        console.error('Error fetching bookings:', fetchError);
        return;
    }

    if (existing && existing.length > 0) {
        console.log(`Found pending booking: ${existing[0].id}`);
        process.exit(0);
    }

    // Create a pending booking if none exist
    // We need a valid sport_id. Let's get basketball.
    const { data: sport } = await supabase.from('sports').select('id').eq('name', 'basketball').single();

    if (!sport) {
        console.error('Basketball sport not found!');
        process.exit(1);
    }

    const { data: newBooking, error: createError } = await supabase
        .from('bookings')
        .insert([{
            sport_id: sport.id,
            customer_name: 'Test Booking for Debug',
            email: 'test@example.com',
            phone: '09123456789',
            people_count: 5,
            booking_date: new Date().toISOString().split('T')[0], // Today
            start_time: '10:00:00',
            end_time: '11:00:00',
            amount: 800,
            status: 'pending',
            payment_status: 'pending',
            rental_option: 'Standard'
        }])
        .select()
        .single();

    if (createError) {
        console.error('Error creating booking:', createError);
    } else {
        console.log(`Created new pending booking: ${newBooking.id}`);
    }
}

ensurePendingBooking();
