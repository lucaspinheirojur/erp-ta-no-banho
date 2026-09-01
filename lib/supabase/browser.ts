"use client";

import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

function publicKey(value?: string) {
  return value && (value.startsWith("eyJ") || value.startsWith("sb_publishable_")) ? value : "";
}

function projectUrl(value?: string) {
  return value && /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/i.test(value)
    ? value
    : "";
}

export function createSupabaseBrowserClient() {
  const url = projectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = publicKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) throw new Error("Supabase não configurado.");
  return createBrowserClient(url, key);
}

export function createSupabaseRecoveryClient() {
  const url = projectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = publicKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) throw new Error("Supabase não configurado.");
  return createClient(url, key, {
    auth: {
      flowType: "implicit",
      detectSessionInUrl: false,
      persistSession: true,
    },
  });
}
