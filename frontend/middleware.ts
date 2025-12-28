import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware is disabled for now - route protection is handled client-side by auth-provider
// The original middleware used cookies for auth detection, but Zustand persist uses localStorage
// which is not accessible in middleware. Client-side route protection in auth-provider.tsx
// provides proper protection after Zustand hydration.

export function middleware(_request: NextRequest) {
  // Just pass through all requests
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|$).*)',
  ],
};
