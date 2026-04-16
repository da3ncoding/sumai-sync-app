import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 未ログインで公開ページ以外にアクセスしたらリダイレクト
  const publicPaths = ["/login", "/forgot-password", "/auth/reset-password"];
  if (!user && !publicPaths.includes(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ログイン済みで /login にアクセスしたらトップへ
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/properties", request.url));
  }

  // ログイン済みでペア未設定なら /pair へ（/pair 自体は除外）
  if (user && pathname !== "/pair") {
    const { data: pair } = await supabase
      .from("pairs")
      .select("id")
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .eq("status", "active")
      .maybeSingle();

    if (!pair) {
      return NextResponse.redirect(new URL("/pair", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
