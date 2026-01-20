export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || adminPassword === 'your_admin_password_here') {
    return false;
  }
  return password === adminPassword;
}
