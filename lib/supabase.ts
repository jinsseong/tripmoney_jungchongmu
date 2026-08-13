import { createClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "@/lib/supabase-url";

const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseUrl = normalizeSupabaseUrl(configuredSupabaseUrl);
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Create a safe client that won't throw during build
let supabaseClient: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  if (typeof window !== "undefined") {
    if (configuredSupabaseUrl.trim() !== supabaseUrl) {
      console.warn(
        "NEXT_PUBLIC_SUPABASE_URL must not include /rest/v1. The URL was normalized automatically."
      );
    }
    console.log("Supabase client initialized:", {
      url: supabaseUrl.substring(0, 30) + "...",
      hasKey: !!supabaseAnonKey,
    });
  }
} else if (typeof window !== "undefined") {
  // Only warn in browser
  console.error(
    "❌ Supabase URL or Anon Key is missing!",
    "\nPlease set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env"
  );
}

export const supabase = supabaseClient || createClient("https://placeholder.supabase.co", "placeholder-key");
