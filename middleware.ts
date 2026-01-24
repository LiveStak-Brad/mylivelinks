import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/auth',
  '/onboarding',
  '/reset-password',
  '/policies',
  '/api',
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

function isValidNextUrl(next: string): boolean {
  // Must start with / and not start with // (protocol-relative)
  // Must not contain protocol (http:, https:, javascript:, etc.)
  if (!next || typeof next !== 'string') return false;
  if (!next.startsWith('/')) return false;
  if (next.startsWith('//')) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(next)) return false;
  // Don't redirect back to auth pages
  if (next === '/login' || next === '/signup' || next.startsWith('/login?') || next.startsWith('/signup?')) return false;
  return true;
}

export async function middleware(request: NextRequest) {
  // Handle Supabase auth session refresh
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  // Refresh session if expired
  try {
    // IMPORTANT:
    // Do not race this with a timeout. Supabase may need to set refreshed auth cookies
    // on the response. If we return early, those cookie writes are lost and users get
    // stuck in a login loop (especially on localhost during OAuth flows).
    
    // First check if we have auth cookies at all - if not, skip getUser() call
    const hasAuthCookie = request.cookies.has('sb-access-token') || 
                          request.cookies.has('sb-refresh-token') ||
                          // Check for Supabase SSR cookie format (domain-specific)
                          Array.from(request.cookies.getAll()).some(c => 
                            c.name.includes('auth-token') || c.name.includes('sb-')
                          );
    
    // If no auth cookies exist AND it's not a public route, redirect to login
    // This prevents unnecessary getUser() calls that slow down the middleware
    if (!hasAuthCookie && !isPublicRoute(pathname)) {
      const fullPath = request.nextUrl.pathname + request.nextUrl.search;
      const loginUrl = new URL('/login', request.url);
      if (isValidNextUrl(fullPath)) {
        loginUrl.searchParams.set('next', fullPath);
      }
      return NextResponse.redirect(loginUrl);
    }
    
    // Only call getUser if we have cookies OR it's a public route
    // This reduces auth checks and prevents redirect loops
    if (hasAuthCookie || isPublicRoute(pathname)) {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Redirect logged-in users from / to /watch (Watch is the centerpoint like TikTok)
      if (user && pathname === '/') {
        return NextResponse.redirect(new URL('/watch', request.url));
      }

      // Auth gate: redirect unauthenticated users to login with next= param
      // Only redirect if we actually checked auth (had cookies) and found no user
      if (!user && !isPublicRoute(pathname) && hasAuthCookie) {
        // Build the full path including query string
        const fullPath = request.nextUrl.pathname + request.nextUrl.search;
        const loginUrl = new URL('/login', request.url);
        if (isValidNextUrl(fullPath)) {
          loginUrl.searchParams.set('next', fullPath);
        }
        return NextResponse.redirect(loginUrl);
      }
    }
  } catch (error) {
    // Never block requests due to transient auth/network issues
    // Log error for debugging but allow the request through
    console.error('[Middleware] Auth check error:', error);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

