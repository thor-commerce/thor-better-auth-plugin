import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, createAuthMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import { authenticateAndCreateSession } from "./helpers/authenticate";
import { getAccessToken } from "./helpers/token-refresh";
import type { SessionData } from "./helpers/authenticate";

// Export helper functions and types
export { getAccessToken } from "./helpers/token-refresh";
export type { SessionData, AuthError } from "./helpers/authenticate";
export type { RefreshTokenResponse } from "./helpers/token-refresh";

export interface ThorAuthPluginConfig {
  /**
   * Thor Commerce GraphQL API endpoint
   * @example "https://api.thorcommerce.io/your-org/storefront/graphql"
   */
  apiEndpoint: string;
  /**
   * Minutes before token expiration to trigger automatic refresh
   * @default 5
   * @example 10 // Refresh tokens when they have 10 minutes remaining
   */
  refreshThresholdMinutes?: number;
}

export const thorAuthPlugin = (config: ThorAuthPluginConfig) => {
  const refreshThreshold = config.refreshThresholdMinutes ?? 5;

  return {
    id: "thor-commerce-auth",
    hooks: {
      after: [
        {
          matcher: (context) => {
            // Intercept getSession responses to automatically refresh tokens
            return context.path === "/get-session" || context.path.includes("session");
          },
          handler: createAuthMiddleware(async (ctx) => {
            // Get the response body to check if it contains a session
            const responseData = ctx.context.returned;
            
            // Only process if we have session data with token info
            if (
              responseData &&
              typeof responseData === "object" &&
              "session" in responseData &&
              responseData.session &&
              typeof responseData.session === "object" &&
              "token" in responseData.session &&
              "expiresAt" in responseData.session
            ) {
              const session = responseData.session as SessionData["session"];
              
              try {
                // Check if token needs refresh and refresh if necessary
                const result = await getAccessToken(
                  config.apiEndpoint,
                  session,
                  refreshThreshold
                );

                // If token was refreshed, update the session cookie
                if (result.refreshed && result.session) {
                  const updatedSessionData: SessionData = {
                    user: (responseData as any).user,
                    session: result.session,
                  };

                  // Persist the refreshed session back to the cookie
                  await setSessionCookie(ctx, updatedSessionData);

                  // Return the response with updated session data
                  return ctx.json({
                    ...responseData,
                    session: result.session,
                  });
                }
              } catch (error) {
                // If refresh fails, log warning but continue with original session
                console.warn(
                  "[thor-better-auth-plugin] Failed to refresh token:",
                  error instanceof Error ? error.message : error
                );
              }
            }

            // Return original response if no refresh was needed or if session data is invalid
            return;
          }),
        },
      ],
    },
    endpoints: {
      customerSignIn: createAuthEndpoint(
        "/customer/sign-in",
        {
          method: "POST",
          body: z.object({
            email: z.string().email(),
            password: z.string().min(1),
          }),
        },
        async (ctx) => {
          const { email, password } = ctx.body;
          const result = await authenticateAndCreateSession(
            config.apiEndpoint,
            email,
            password
          );

          // Check if result is an error
          if ("error" in result) {
            return ctx.json({ error: result.error }, { status: result.status });
          }

          await setSessionCookie(ctx, result);
          return ctx.json({
            user: result.user,
            expiresAt: result.session.expiresAt,
          });
        }
      ),
    },
  } satisfies BetterAuthPlugin;
};