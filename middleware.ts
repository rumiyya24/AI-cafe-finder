import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_API_PATHS = ["/api/favorites", "/api/notes", "/api/preferences"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  const isProtectedWrite =
    method !== "GET" &&
    PROTECTED_API_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (!isProtectedWrite) {
    return NextResponse.next();
  }

  const username = process.env.SITE_USERNAME;
  const password = process.env.SITE_PASSWORD;

  if (!username || !password) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader) {
    const encoded = authHeader.split(" ")[1] || "";
    const decoded = Buffer.from(encoded, "base64").toString();
    const [user, pass] = decoded.split(":");

    if (user === username && pass === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="AI Cafe Finder"' },
  });
}

export const config = {
  matcher: "/api/:path*",
};