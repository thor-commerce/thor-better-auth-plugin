# Thor Better Auth Plugin

Better Auth plugin for Thor Commerce authentication.

## Installation

```bash
npm install @thor-commerce/better-auth-thor
# or
pnpm add @thor-commerce/better-auth-thor
# or
yarn add @thor-commerce/better-auth-thor
```

## Usage

### Server Setup

Configure the plugin in your Better Auth server instance:

```typescript
import { betterAuth } from "better-auth";
import { thorAuthPlugin } from "@thor-commerce/better-auth-thor";

export const auth = betterAuth({
  // ... your other config
  plugins: [
    thorAuthPlugin({
      apiEndpoint: "https://api.thorcommerce.io/your-org/storefront/graphql",
      refreshThresholdMinutes: 5, // Optional: auto-refresh tokens with 5 min remaining (default: 5)
    }),
  ],
});
```
### Using the Custom Sign-In Endpoint

Once configured, you can use the `customerSignIn` endpoint:

```typescript
"use server";

import { auth } from "@/lib/auth";

export async function login(email: string, password: string) {
  try {
    const response = await auth.api.customerSignIn({
      body: { email, password },
    });

    if ("error" in response) {
      return { error: response.error };
    }

    return { success: true, user: response.user };
  } catch (err) {
    console.error(err);
    return { error: "Something went wrong" };
  }
}
```

## Features

### Automatic Token Refresh

The plugin automatically refreshes Thor Commerce access tokens when they're about to expire. When `auth.api.getSession()` is called, the plugin checks if the token is expiring soon (default: within 5 minutes) and automatically refreshes it using the refresh token.

**No code changes required!** Simply configure the plugin and tokens will be refreshed transparently:

```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Tokens are automatically refreshed if needed
const session = await auth.api.getSession({ headers: await headers() });

// Use the session with confidence - tokens are always fresh
if (session) {
  const response = await fetch(thorApiUrl, {
    headers: {
      Authorization: `Bearer ${session.session.token}`,
    },
  });
}
```

**Benefits:**
- ✅ Eliminates manual token refresh logic
- ✅ Prevents authentication errors from expired tokens
- ✅ Seamlessly updates session cookies
- ✅ Configurable refresh threshold for different use cases
- ✅ Graceful error handling if refresh fails

**Configuration:**

Adjust when tokens are refreshed using the `refreshThresholdMinutes` option:

```typescript
thorAuthPlugin({
  apiEndpoint: "https://api.thorcommerce.io/your-org/storefront/graphql",
  refreshThresholdMinutes: 10, // Refresh when 10 minutes remain
})
```

**Recommended thresholds:**
- `2-3 minutes`: Critical operations requiring fresh tokens
- `5 minutes` (default): Balanced for most applications
- `10-15 minutes`: Batch processes or long-running operations

## Helper Functions

### `getAccessToken()` (Advanced)

> **Note:** With automatic token refresh enabled, you typically don't need to call this function manually. It's provided for advanced use cases where you need explicit control over token refresh timing.

Manually manages access token refresh based on expiration time.

```typescript
import { getAccessToken } from "@thor-commerce/better-auth-thor";

// Get current session (from Better Auth)
const session = await auth.api.getSession({ headers: await headers() });

if (session) {
  const result = await getAccessToken(
    "https://api.thorcommerce.io/your-org/storefront/graphql",
    session.session,
    5 // Optional: refresh threshold in minutes (default: 5)
  );

  // If token was refreshed, update the session
  if (result.refreshed && result.session) {
    // Update your session storage with result.session
    // This is application-specific
  }

  // Use the access token for API calls
  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${result.accessToken}`,
    },
  });
}
```

**Parameters:**
- `apiEndpoint` (string): Thor Commerce GraphQL API endpoint
- `session` (SessionData["session"]): Current session object from Better Auth
- `refreshThresholdMinutes` (number, optional): Minutes before expiration to trigger refresh (default: 5)

**Returns:**
```typescript
{
  accessToken: string;     // Valid access token (refreshed or existing)
  refreshed: boolean;      // Whether the token was refreshed
  session?: SessionData["session"]; // Updated session data (only if refreshed)
}
```

**How it works:**
1. Checks if the access token expires within the threshold (default 5 minutes)
2. If expiring soon or already expired, automatically refreshes using the refresh token
3. Returns the valid access token and optionally the updated session data
4. If refresh fails, returns the existing token (calling code should handle errors)

## API

### Server Plugin

#### `thorAuthPlugin(config)`

Creates the server-side plugin.

**Config:**
- `apiEndpoint` (string, required): Thor Commerce GraphQL API endpoint
- `refreshThresholdMinutes` (number, optional): Minutes before token expiration to trigger automatic refresh. Default: `5`

**Example:**
```typescript
thorAuthPlugin({
  apiEndpoint: "https://api.thorcommerce.io/your-org/storefront/graphql",
  refreshThresholdMinutes: 5, // Refresh tokens with 5 minutes remaining
})
```

## Endpoints

### `customerSignIn`

Authenticates a user with Thor Commerce and creates a Better Auth session.

**Method:** `POST`

**Body:**
```typescript
{
  email: string;
  password: string;
}
```

**Response (Success):**
```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  expiresAt: Date;
}
```

**Response (Error):**
```typescript
{
  error: string;
}
```

## Development

### Running Tests

```bash
# Run all tests (mocked)
pnpm test

# Run real integration tests (requires .env setup)
pnpm test:real

# Open test UI
pnpm test:ui
```

### Building

```bash
pnpm build
```

## License

MIT
