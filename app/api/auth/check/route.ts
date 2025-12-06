import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_USER } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token');

    if (!authToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const decoded = Buffer.from(authToken.value, 'base64').toString();
    const [username, password] = decoded.split(':');

    if (username === AUTH_USER.username && password === AUTH_USER.password) {
      return NextResponse.json({ authenticated: true, username });
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
