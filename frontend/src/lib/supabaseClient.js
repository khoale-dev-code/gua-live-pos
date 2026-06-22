import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing VITE_SUPABASE_URL in frontend/.env");
}

if (!supabaseKey) {
  throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY in frontend/.env");
}

export const supabase = createClient(supabaseUrl, supabaseKey);