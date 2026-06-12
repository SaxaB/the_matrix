import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes that anonymous users can access (no session). */
function isPublicForAnonymous(pathname: string): boolean {
  if (pathname === "/auth/callback" || pathname.startsWith("/auth/")) {
    return true;
  }
  if (pathname.startsWith("/api/")) {
    return true;
  }
  return pathname === "/" || pathname === "/login" || pathname === "/signup";
}

/** App sections that require having completed the risk questionnaire. */
function requiresCompletedRiskProfile(pathname: string): boolean {
  const prefixes = [
    "/dashboard",
    "/portfolio",
    "/analysis",
    "/stocks",
    "/como-funciona",
    "/perfil",
    "/ajustes",
  ];
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const userResult = await Promise.race([
    supabase.auth.getUser(),
    new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), 8000)
    ),
  ]);
  const user = userResult.data.user;

  const pathname = request.nextUrl.pathname;

  if (!user) {
    if (!isPublicForAnonymous(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const { data: profileRow } = await supabase
    .schema("finance").from("user_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const hasRiskProfile = !!profileRow;

  if (hasRiskProfile && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (hasRiskProfile && pathname === "/onboarding") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (!hasRiskProfile && requiresCompletedRiskProfile(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  if (!hasRiskProfile && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
