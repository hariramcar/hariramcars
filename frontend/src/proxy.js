import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Protect all admin routes except login
  if (
    pathname.startsWith('/admin') &&
    !pathname.startsWith('/admin/login')
  ) {
    const token = request.cookies.get('token')?.value;

    const redirectToLogin = () => {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    };

    if (!token) {
      return redirectToLogin();
    }

    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'hariram-motors-jwt-secret-change-in-production-2024'
      );
      
      await jwtVerify(token, secret, {
        issuer: 'hariram-motors',
        audience: 'hariram-motors-admin',
      });
    } catch (err) {
      console.error('Middleware JWT verification failed:', err.message);
      return redirectToLogin();
    }
  }



  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
