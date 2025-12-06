import { cookies } from 'next/headers';

/**
 * Get current authenticated user from cookies
 * Returns username or null if not authenticated
 */
export async function getCurrentUser(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token');

    if (!authToken) {
      return null;
    }

    const decoded = Buffer.from(authToken.value, 'base64').toString();
    const [username] = decoded.split(':');

    return username || null;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

/**
 * Get current authenticated user (synchronous version for client-side)
 * Note: This should only be used in client components with proper auth checks
 */
export function getCurrentUserSync(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Get cookie value
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(c => c.trim().startsWith('auth-token='));
    
    if (!authCookie) {
      return null;
    }

    const tokenValue = authCookie.split('=')[1];
    const decoded = Buffer.from(tokenValue, 'base64').toString();
    const [username] = decoded.split(':');

    return username || null;
  } catch (error) {
    console.error('Get user sync error:', error);
    return null;
  }
}



