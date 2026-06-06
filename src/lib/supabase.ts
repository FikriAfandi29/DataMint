import { createClient } from "@supabase/supabase-js";

export const supabaseUrl =
  "https://gryuyadjozvjtlnsyicp.supabase.co";

export const supabaseAnonKey =
  "sb_publishable_H2w2j86aMb2K5SJLuoPhJQ_17rNAWko";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export const isSupabaseConfigured = () => true;

console.log("SUPABASE URL =", supabaseUrl);
console.log("SUPABASE OK =", true);