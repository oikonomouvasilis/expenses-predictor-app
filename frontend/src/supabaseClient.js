import { createClient } from '@supabase/supabase-js';

/**
 * SUPABASE CLIENT INITIALIZATION
 * Connects the frontend to the backend cloud services (Auth, Database, Storage).
 *
 * Both values come from the environment. The anon key is a publishable key and
 * ends up in the browser bundle either way — but the project URL does not
 * belong in version control, and row level security is what actually protects
 * the data. See .env.example.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in.'
  );
}

// Export the initialized client to be used in App.jsx and Auth.jsx
export const supabase = createClient(supabaseUrl, supabaseKey);
