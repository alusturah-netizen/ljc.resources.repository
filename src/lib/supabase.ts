import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eprmnghhatpfugjoplyu.supabase.co';
const supabaseAnonKey = 'PASTE_YOUR_NEW_PROJECT_ANON_KEY_HERE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);