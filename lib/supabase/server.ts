import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function publicKey(value?: string) {
  return value && (value.startsWith("eyJ") || value.startsWith("sb_publishable_")) ? value : "";
}

function projectUrl(value?: string) {
  return value && /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/i.test(value)
    ? value
    : "";
}

function credentials() {
  const url = projectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = publicKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) throw new Error("Supabase não configurado.");
  return { url, key };
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, key } = credentials();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies; proxy.ts refreshes them.
        }
      },
    },
  });
}
