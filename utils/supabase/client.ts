import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// Only throw errors in production or if explicitly required
// In development, we'll use placeholder values to prevent crashes
if (!supabaseUrl && process.env.NODE_ENV === "production") {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!supabaseKey && process.env.NODE_ENV === "production") {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY environment variable");
}

export const createClient = () =>
  createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
  );
