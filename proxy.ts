import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function publicKey(value?: string) {
  return value && (value.startsWith("eyJ") || value.startsWith("sb_publishable_"))
    ? value
    : "";
}

function projectUrl(value?: string) {
  return value && /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/i.test(value)
    ? value
    : "";
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = projectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = publicKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = { matcher: ["/gestao/:path*", "/login", "/auth/:path*", "/api/:path*"] };
