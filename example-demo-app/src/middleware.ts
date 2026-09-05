import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth has been removed. This middleware is a passthrough.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
