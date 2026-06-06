import { createClient } from "@supabase/supabase-js";

// Retrieve configuration from Vite environment variables or localStorage for dynamic runtime configuration
const getSupabaseConfig = () => {
  const env = (import.meta as any).env || {};
  const url = env.VITE_SUPABASE_URL || localStorage.getItem("supabase_url") || "";
  const key = env.VITE_SUPABASE_ANON_KEY || localStorage.getItem("supabase_anon_key") || "";
  return { url, key };
};

export const { url: supabaseUrl, key: supabaseAnonKey } = getSupabaseConfig();

// Safe lazy/conditional initialization so missing keys never crash the app
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

/**
 * Returns true if Supabase URL and Anon Key are configured
 */
export const isSupabaseConfigured = (): boolean => {
  return !!supabase;
};

/**
 * Persists custom Supabase credentials in local storage and reloads
 */
export const saveSupabaseCredentials = (url: string, key: string) => {
  localStorage.setItem("supabase_url", url.trim());
  localStorage.setItem("supabase_anon_key", key.trim());
  localStorage.setItem("auth_driver", "supabase");
  window.location.reload();
};

/**
 * Removes custom Supabase credentials
 */
export const clearSupabaseCredentials = () => {
  localStorage.removeItem("supabase_url");
  localStorage.removeItem("supabase_anon_key");
  localStorage.setItem("auth_driver", "supabase");
  window.location.reload();
};

console.log("SUPABASE URL =", supabaseUrl);
console.log("SUPABASE KEY =", supabaseAnonKey?.slice(0,20));
console.log("SUPABASE OK =", !!(supabaseUrl && supabaseAnonKey));