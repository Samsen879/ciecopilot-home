/**
 * Resolve current user session token from an auth client.
 * Throws if no active session is available.
 */
export async function requireSessionAccessToken(authClient) {
  const { data: { session } } = await authClient.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error('User not authenticated');
  }

  return accessToken;
}
