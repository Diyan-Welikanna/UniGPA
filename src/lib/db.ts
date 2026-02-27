import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side only — service role key bypasses Row Level Security
export const db = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export default pool;
