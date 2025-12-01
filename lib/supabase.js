import { createClient } from '@supabase/supabase-js';

// Singleton Supabase client
let supabase = null;

export function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return supabase;
}

// Auth helpers
export async function getCurrentUser() {
  const { data: { session } } = await getSupabase().auth.getSession();
  return session?.user || null;
}

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

// Magic link auth (for Phase 1)
export async function signInWithMagicLink(email) {
  const { data, error } = await getSupabase().auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/app`,
    },
  });
  if (error) throw error;
  return data;
}

export function onAuthStateChange(callback) {
  return getSupabase().auth.onAuthStateChange(callback);
}

