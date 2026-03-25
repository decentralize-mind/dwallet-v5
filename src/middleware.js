import { NextResponse } from "next/server";

const rateLimit = new Map();

export function middleware(request) {
  const ip  = request.headers.get("x-forwarded-for") || "unknown";
  const key = `${ip}:${request.nextUrl.pathname}`;
  const now = Date.now();
  const windowMs = 60_000; // 1 minute
  const maxRequests = 30;  // 30 requests per minute per IP

  const record = rateLimit.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count   = 0;
    record.resetAt = now + windowMs;
  }

  record.count++;
  rateLimit.set(key, record);

  if (record.count > maxRequests) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
