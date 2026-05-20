import { createClient } from '@supabase/supabase-js';

// 🟢 Hardcoding the exact URL from your active Scholar Vault dashboard
const supabaseUrl = 'https://eprmnghhatpfugjoplyu.supabase.co';

// 🔍 PASTE YOUR ACTUAL SCHOLAR VAULT ANON KEY INSTEAD OF THE TEXT BELOW:
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwcm1uZ2hoYXRwZnVnam9wbHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjk3NjQsImV4cCI6MjA5NDg0NTc2NH0.bpzWfpluaTHys4TdhCpLZeIkfb-dPEaEaeZMHvQ5woY';

console.log("CURRENTLY CONNECTING TO:", supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);