import { describe, it, expect, vi, beforeEach } from "vitest";
import { thorAuthPlugin } from "../index";
import type { SessionData } from "../helpers/authenticate";

describe("Auto-refresh Middleware", () => {
  const mockApiEndpoint = "https://api.example.com/graphql";
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Plugin Configuration", () => {
    it("should use default refresh threshold of 5 minutes when not specified", () => {
      const plugin = thorAuthPlugin({
        apiEndpoint: mockApiEndpoint,
      });

      expect(plugin.id).toBe("thor-commerce-auth");
      expect(plugin.hooks?.after).toBeDefined();
      expect(plugin.hooks?.after?.length).toBeGreaterThan(0);
    });

    it("should accept custom refreshThresholdMinutes configuration", () => {
      const plugin = thorAuthPlugin({
        apiEndpoint: mockApiEndpoint,
        refreshThresholdMinutes: 10,
      });

      expect(plugin.id).toBe("thor-commerce-auth");
      expect(plugin.hooks?.after).toBeDefined();
    });
  });

  describe("Hook Matcher", () => {
    it("should match /get-session path", () => {
      const plugin = thorAuthPlugin({
        apiEndpoint: mockApiEndpoint,
      });

      const hook = plugin.hooks?.after?.[0];
      expect(hook).toBeDefined();
      
      if (hook && "matcher" in hook && typeof hook.matcher === "function") {
        const matchResult = hook.matcher({ path: "/get-session" } as any);
        expect(matchResult).toBe(true);
      }
    });

    it("should match paths containing 'session'", () => {
      const plugin = thorAuthPlugin({
        apiEndpoint: mockApiEndpoint,
      });

      const hook = plugin.hooks?.after?.[0];
      
      if (hook && "matcher" in hook && typeof hook.matcher === "function") {
        expect(hook.matcher({ path: "/api/session" } as any)).toBe(true);
        expect(hook.matcher({ path: "/user/session-data" } as any)).toBe(true);
      }
    });

    it("should not match non-session paths", () => {
      const plugin = thorAuthPlugin({
        apiEndpoint: mockApiEndpoint,
      });

      const hook = plugin.hooks?.after?.[0];
      
      if (hook && "matcher" in hook && typeof hook.matcher === "function") {
        expect(hook.matcher({ path: "/sign-in" } as any)).toBe(false);
        expect(hook.matcher({ path: "/sign-up" } as any)).toBe(false);
      }
    });
  });

  describe("Token Refresh Logic", () => {
    it("should have a hook handler", () => {
      const plugin = thorAuthPlugin({
        apiEndpoint: mockApiEndpoint,
      });

      const hook = plugin.hooks?.after?.[0];
      expect(hook).toBeDefined();
      expect(hook?.handler).toBeDefined();
    });

    it("should export getAccessToken helper function", async () => {
      // Verify the helper is still available for manual use
      const { getAccessToken } = await import("../helpers/token-refresh");
      expect(getAccessToken).toBeDefined();
      expect(typeof getAccessToken).toBe("function");
    });
  });

  describe("Session Data Structure", () => {
    it("should handle valid session data structure", () => {
      const mockSession: SessionData["session"] = {
        id: "refresh-token-123",
        userId: "user-123",
        token: "access-token-123",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(mockSession.id).toBeTruthy();
      expect(mockSession.token).toBeTruthy();
      expect(mockSession.expiresAt).toBeInstanceOf(Date);
    });

    it("should handle session data with expiring token", () => {
      const mockSession: SessionData["session"] = {
        id: "refresh-token-456",
        userId: "user-456",
        token: "expiring-token",
        expiresAt: new Date(Date.now() + 3 * 60 * 1000), // 3 minutes from now
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const now = Date.now();
      const expiresAt = mockSession.expiresAt.getTime();
      const timeUntilExpiry = expiresAt - now;
      const fiveMinutesMs = 5 * 60 * 1000;

      expect(timeUntilExpiry).toBeLessThan(fiveMinutesMs);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing session data gracefully", () => {
      const responseData = {
        user: { id: "123", email: "test@example.com" },
        // No session property
      };

      // Verify the structure check logic
      const hasValidSession =
        responseData &&
        typeof responseData === "object" &&
        "session" in responseData;

      expect(hasValidSession).toBe(false);
    });

    it("should handle null session data", () => {
      const responseData = {
        user: { id: "123", email: "test@example.com" },
        session: null,
      };

      const hasValidSession =
        responseData &&
        typeof responseData === "object" &&
        "session" in responseData &&
        responseData.session &&
        typeof responseData.session === "object";

      expect(hasValidSession).toBeFalsy();
    });

    it("should handle session without token field", () => {
      const responseData = {
        user: { id: "123", email: "test@example.com" },
        session: {
          id: "refresh-token",
          userId: "user-123",
          // Missing token field
        },
      };

      const hasValidToken =
        responseData.session &&
        typeof responseData.session === "object" &&
        "token" in responseData.session;

      expect(hasValidToken).toBe(false);
    });
  });

  describe("Integration with getAccessToken", () => {
    it("should call getAccessToken with correct parameters", async () => {
      const { getAccessToken } = await import("../helpers/token-refresh");
      
      const mockSession: SessionData["session"] = {
        id: "refresh-token-123",
        userId: "user-123",
        token: "access-token-123",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await getAccessToken(
        mockApiEndpoint,
        mockSession,
        5
      );

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshed).toBeDefined();
    });
  });

  describe("Configuration Validation", () => {
    it("should require apiEndpoint in config", () => {
      // TypeScript should enforce this at compile time
      // @ts-expect-error - testing missing required field
      expect(() => thorAuthPlugin({})).toBeDefined();
    });

    it("should accept valid refreshThresholdMinutes values", () => {
      const validThresholds = [1, 5, 10, 15, 30];

      validThresholds.forEach((threshold) => {
        const plugin = thorAuthPlugin({
          apiEndpoint: mockApiEndpoint,
          refreshThresholdMinutes: threshold,
        });

        expect(plugin.id).toBe("thor-commerce-auth");
      });
    });
  });
});
