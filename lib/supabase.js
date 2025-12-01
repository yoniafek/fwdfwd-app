import { createClient } from '@supabase/supabase-js';

// Singleton Supabase client
let supabase = null;

export function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          // Persist session in localStorage
          persistSession: true,
          // Auto-refresh the session
          autoRefreshToken: true,
          // Detect session from URL (for magic link redirects)
          detectSessionInUrl: true
        }
      }
    );
  }
  return supabase;
}

// Auth helpers
export async function getCurrentUser() {
  const { data: { session } } = await getSupabase().auth.getSession();
  return session?.user || null;
}

// Magic link sign in (passwordless)
export async function signInWithMagicLink(email) {
  const redirectUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/app`
    : 'https://fwdfwd.com/app';
    
  const { data, error } = await getSupabase().auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectUrl,
    },
  });
  
  if (error) throw error;
  return data;
}

// Legacy password auth (keeping for backward compatibility during transition)
export async function signInWithPassword(email, password) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ 
    email, 
    password 
  });
  if (error) throw error;
  return data;
}

export async function signUp(email, password) {
  const { data, error } = await getSupabase().auth.signUp({ 
    email, 
    password 
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(callback) {
  return getSupabase().auth.onAuthStateChange(callback);
}

// Get session with refresh
export async function getSession() {
  const { data: { session }, error } = await getSupabase().auth.getSession();
  if (error) throw error;
  return session;
}

// Refresh session manually if needed
export async function refreshSession() {
  const { data: { session }, error } = await getSupabase().auth.refreshSession();
  if (error) throw error;
  return session;
}
