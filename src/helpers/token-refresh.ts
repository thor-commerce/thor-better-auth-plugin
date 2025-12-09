import type { SessionData } from "./authenticate";

type RefreshTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

async function refreshAccessToken(
  apiEndpoint: string,
  refreshToken: string
): Promise<RefreshTokenResponse | null> {
  const res = await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: `
        mutation CustomerAccessTokenRefresh($input: CustomerAccessTokenRefreshInput!) {
          customerAccessTokenRefresh(input: $input) {
            customerAccessToken {
              accessToken
              refreshToken
              expiresIn
            }
          }
        }
      `,
      variables: {
        input: {
          refreshToken: refreshToken,
        },
      },
    }),
  });

  if (!res.ok) return null;

  const json: any = await res.json();
  const tokenNode =
    json?.data?.customerAccessTokenRefresh?.customerAccessToken;

  if (!tokenNode) return null;

  return {
    accessToken: tokenNode.accessToken,
    refreshToken: tokenNode.refreshToken,
    expiresIn: tokenNode.expiresIn,
  };
}

/**
 * Gets a valid access token, refreshing it if necessary.
 * 
 * Checks if the current access token is expiring within the threshold (default 5 minutes).
 * If so, automatically refreshes the token using the refresh token from the session.
 * 
 * @param apiEndpoint - Thor Commerce GraphQL API endpoint
 * @param session - Current session data containing token and expiration info
 * @param refreshThresholdMinutes - Minutes before expiration to trigger refresh (default: 5)
 * @returns Object containing the access token and updated session data if refreshed
 * 
 * @example
 * ```typescript
 * const result = await getAccessToken(apiEndpoint, sessionData);
 * if (result.refreshed) {
 *   // Update session with new data
 *   await updateSession(result.session);
 * }
 * // Use the access token
 * const response = await fetch(url, {
 *   headers: { Authorization: `Bearer ${result.accessToken}` }
 * });
 * ```
 */
export async function getAccessToken(
  apiEndpoint: string,
  session: SessionData["session"],
  refreshThresholdMinutes: number = 5
): Promise<{
  accessToken: string;
  refreshed: boolean;
  session?: SessionData["session"];
}> {
  const now = Date.now();
  const expiresAt = session.expiresAt.getTime();
  const thresholdMs = refreshThresholdMinutes * 60 * 1000;
  const timeUntilExpiry = expiresAt - now;

  // If token is still valid and not close to expiration
  if (timeUntilExpiry > thresholdMs) {
    return {
      accessToken: session.token,
      refreshed: false,
    };
  }

  // Token is expiring soon or expired, refresh it
  const refreshToken = session.id; // session.id is the refresh token
  const refreshed = await refreshAccessToken(apiEndpoint, refreshToken);

  if (!refreshed) {
    // If refresh fails, return the current token anyway
    // The calling code should handle the case where the token might be expired
    return {
      accessToken: session.token,
      refreshed: false,
    };
  }

  // Create updated session data
  const newExpiresAt = new Date(now + refreshed.expiresIn * 1000);
  const updatedSession: SessionData["session"] = {
    ...session,
    id: refreshed.refreshToken, // Update refresh token
    token: refreshed.accessToken, // Update access token
    expiresAt: newExpiresAt,
    updatedAt: new Date(now),
  };

  return {
    accessToken: refreshed.accessToken,
    refreshed: true,
    session: updatedSession,
  };
}

export type { RefreshTokenResponse };
