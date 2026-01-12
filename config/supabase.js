import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// 🔴 عوضهم بالقيم متاعك من Supabase
const SUPABASE_URL = "https://tmdfkuujbhbvzrjaixnn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtZGZrdXVqYmhidnpyamFpeG5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjUwODQsImV4cCI6MjA4MzcwMTA4NH0.7JQJeKpWUNpq8VedgMEng6k_ASwA-31iuNAhADID7Vc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================
// Auth helpers
// ==========================

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getUserProfile(userId) {
  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/login.html";
}

export async function checkAuth() {
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    window.location.href = "/login.html";
    return null;
  }

  const profile = await getUserProfile(user.id);

  if (!profile || profile.is_active === false) {
    await signOut();
    return null;
  }

  return { user, profile };
}
