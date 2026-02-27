const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
// Use Service Role Key for backend operations to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const missingEnvError =
  'Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).';

if (!supabaseUrl || !supabaseKey) {
  console.warn(`[DB CONFIG] ${missingEnvError}`);
}

const supabase = (!supabaseUrl || !supabaseKey)
  ? {
    from() {
      throw new Error(missingEnvError);
    }
  }
  : createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
