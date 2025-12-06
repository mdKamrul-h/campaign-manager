// Simple authentication for single user
export const AUTH_USER = {
  username: 'mallick99',
  password: 'nazrulNDC99'
};

export function validateCredentials(username: string, password: string): boolean {
  return username === AUTH_USER.username && password === AUTH_USER.password;
}

export function hashPassword(password: string): string {
  // Simple base64 encoding for cookie storage
  return Buffer.from(password).toString('base64');
}

export function verifyPassword(hash: string, password: string): boolean {
  return hash === hashPassword(password);
}
